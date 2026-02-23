import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { GraphEntityType, EntityConnectionType } from '@/types/database'

const VALID_ENTITY_TYPES: GraphEntityType[] = [
  'idea', 'feature', 'blueprint', 'work_order', 'feedback', 'artifact',
]
const VALID_CONNECTION_TYPES: EntityConnectionType[] = [
  'references', 'depends_on', 'relates_to', 'implements',
  'derived_from', 'conflicts_with', 'complements',
]

// Resolve entity names from their respective tables
async function resolveEntityName(
  supabase: ReturnType<typeof createServiceClient>,
  entityType: string,
  entityId: string
): Promise<string> {
  const tableMap: Record<string, { table: string; nameCol: string }> = {
    idea: { table: 'ideas', nameCol: 'title' },
    feature: { table: 'feature_nodes', nameCol: 'name' },
    blueprint: { table: 'blueprints', nameCol: 'title' },
    work_order: { table: 'work_orders', nameCol: 'title' },
    feedback: { table: 'feedback_submissions', nameCol: 'content' },
    artifact: { table: 'artifacts', nameCol: 'name' },
  }

  const mapping = tableMap[entityType]
  if (!mapping) return 'Unknown'

  const { data } = await supabase
    .from(mapping.table)
    .select(mapping.nameCol)
    .eq('id', entityId)
    .single()

  if (!data) return 'Deleted'

  const name = (data as Record<string, string>)[mapping.nameCol] || 'Untitled'
  // Truncate feedback content to first 60 chars
  if (entityType === 'feedback' && name.length > 60) {
    return name.substring(0, 60) + '...'
  }
  return name
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType') as GraphEntityType | null
    const entityId = searchParams.get('entityId')
    const mode = searchParams.get('mode') || 'explore' // 'explore' | 'count'
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (!entityType || !entityId) {
      return Response.json({ error: 'entityType and entityId are required' }, { status: 400 })
    }

    // Fetch outbound connections (this entity is the source)
    const { data: outbound } = await supabase
      .from('entity_connections')
      .select('*')
      .eq('project_id', projectId)
      .eq('source_type', entityType)
      .eq('source_id', entityId)
      .order('connection_type')
      .order('created_at', { ascending: false })

    // Fetch inbound connections (this entity is the target)
    const { data: inbound } = await supabase
      .from('entity_connections')
      .select('*')
      .eq('project_id', projectId)
      .eq('target_type', entityType)
      .eq('target_id', entityId)
      .order('connection_type')
      .order('created_at', { ascending: false })

    const outboundList = outbound || []
    const inboundList = inbound || []

    // Count mode — just return counts
    if (mode === 'count') {
      const byType: Record<string, number> = {}
      for (const c of [...outboundList, ...inboundList]) {
        byType[c.connection_type] = (byType[c.connection_type] || 0) + 1
      }
      return Response.json({
        count: outboundList.length + inboundList.length,
        outbound_count: outboundList.length,
        inbound_count: inboundList.length,
        by_type: byType,
      })
    }

    // Explore mode — resolve entity names
    const enrichedOutbound = await Promise.all(
      outboundList.map(async (c) => ({
        connection_id: c.id,
        connection_type: c.connection_type,
        is_auto_detected: c.is_auto_detected,
        created_at: c.created_at,
        target: {
          type: c.target_type,
          id: c.target_id,
          name: await resolveEntityName(supabase, c.target_type, c.target_id),
        },
      }))
    )

    const enrichedInbound = await Promise.all(
      inboundList.map(async (c) => ({
        connection_id: c.id,
        connection_type: c.connection_type,
        is_auto_detected: c.is_auto_detected,
        created_at: c.created_at,
        source: {
          type: c.source_type,
          id: c.source_id,
          name: await resolveEntityName(supabase, c.source_type, c.source_id),
        },
      }))
    )

    return Response.json({
      outbound: enrichedOutbound,
      inbound: enrichedInbound,
      total_count: outboundList.length + inboundList.length,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { sourceType, sourceId, targetType, targetId, connectionType } = body
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (!VALID_ENTITY_TYPES.includes(sourceType)) {
      return Response.json({ error: 'Invalid sourceType' }, { status: 400 })
    }
    if (!VALID_ENTITY_TYPES.includes(targetType)) {
      return Response.json({ error: 'Invalid targetType' }, { status: 400 })
    }
    if (!VALID_CONNECTION_TYPES.includes(connectionType)) {
      return Response.json({ error: 'Invalid connectionType' }, { status: 400 })
    }
    if (!sourceId || !targetId) {
      return Response.json({ error: 'sourceId and targetId are required' }, { status: 400 })
    }
    if (sourceType === targetType && sourceId === targetId) {
      return Response.json({ error: 'Cannot connect entity to itself' }, { status: 400 })
    }

    const { data: connection, error } = await supabase
      .from('entity_connections')
      .insert({
        project_id: projectId,
        source_type: sourceType,
        source_id: sourceId,
        target_type: targetType,
        target_id: targetId,
        connection_type: connectionType,
        created_by: user.id,
        is_auto_detected: false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: 'Connection already exists' }, { status: 409 })
      }
      console.error('Error creating connection:', error)
      return Response.json({ error: 'Failed to create connection' }, { status: 500 })
    }

    return Response.json(connection, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
