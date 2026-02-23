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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { sourceType, sourceId, suggestions } = body
    const supabase = createServiceClient()

    // Validate source
    if (!sourceType || !VALID_ENTITY_TYPES.includes(sourceType)) {
      return Response.json({ error: 'Invalid sourceType' }, { status: 400 })
    }
    if (!sourceId) {
      return Response.json({ error: 'sourceId is required' }, { status: 400 })
    }
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return Response.json({ error: 'suggestions array is required' }, { status: 400 })
    }

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

    // Validate and create connections
    const inserts = []
    for (const s of suggestions) {
      if (!VALID_ENTITY_TYPES.includes(s.target_type)) continue
      if (!VALID_CONNECTION_TYPES.includes(s.connection_type)) continue
      if (!s.target_id) continue
      if (sourceType === s.target_type && sourceId === s.target_id) continue

      inserts.push({
        project_id: projectId,
        source_type: sourceType,
        source_id: sourceId,
        target_type: s.target_type,
        target_id: s.target_id,
        connection_type: s.connection_type,
        created_by: user.id,
        is_auto_detected: true,
        metadata: {
          confidence: s.confidence,
          method: s.method,
          evidence: s.evidence,
        },
      })
    }

    if (inserts.length === 0) {
      return Response.json({ error: 'No valid suggestions to accept' }, { status: 400 })
    }

    // Use upsert to handle duplicates gracefully
    const { data: created, error } = await supabase
      .from('entity_connections')
      .upsert(inserts, {
        onConflict: 'source_type,source_id,target_type,target_id,connection_type',
        ignoreDuplicates: true,
      })
      .select('id')

    if (error) {
      console.error('Error creating connections:', error)
      return Response.json({ error: 'Failed to create connections' }, { status: 500 })
    }

    return Response.json({
      success: true,
      created_count: created?.length ?? inserts.length,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
