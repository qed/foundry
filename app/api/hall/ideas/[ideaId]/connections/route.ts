import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

const VALID_CONNECTION_TYPES = ['related', 'duplicates', 'extends'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const user = await requireAuth()
    const { ideaId } = await params
    const { targetIdeaId, connectionType } = await request.json()

    if (!ideaId || !targetIdeaId || !connectionType) {
      return Response.json({ error: 'targetIdeaId and connectionType required' }, { status: 400 })
    }

    if (!VALID_CONNECTION_TYPES.includes(connectionType)) {
      return Response.json({ error: 'Invalid connection type' }, { status: 400 })
    }

    if (ideaId === targetIdeaId) {
      return Response.json({ error: 'Cannot connect an idea to itself' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify both ideas exist and user has access
    const { data: sourceIdea } = await supabase
      .from('ideas')
      .select('project_id')
      .eq('id', ideaId)
      .single()

    if (!sourceIdea) {
      return Response.json({ error: 'Source idea not found' }, { status: 404 })
    }

    const { data: targetIdea } = await supabase
      .from('ideas')
      .select('project_id')
      .eq('id', targetIdeaId)
      .single()

    if (!targetIdea || targetIdea.project_id !== sourceIdea.project_id) {
      return Response.json({ error: 'Target idea not found or in different project' }, { status: 404 })
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', sourceIdea.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Check for existing connection (either direction)
    const { data: existing } = await supabase
      .from('idea_connections')
      .select('id')
      .or(`and(source_idea_id.eq.${ideaId},target_idea_id.eq.${targetIdeaId}),and(source_idea_id.eq.${targetIdeaId},target_idea_id.eq.${ideaId})`)

    if (existing && existing.length > 0) {
      return Response.json({ error: 'Connection already exists' }, { status: 409 })
    }

    // Create the connection
    const { data: connection, error } = await supabase
      .from('idea_connections')
      .insert({
        source_idea_id: ideaId,
        target_idea_id: targetIdeaId,
        connection_type: connectionType,
        created_by: user.id,
      })
      .select()
      .single()

    if (error || !connection) {
      return Response.json({ error: 'Failed to create connection' }, { status: 500 })
    }

    return Response.json(connection, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const user = await requireAuth()
    const { ideaId } = await params

    if (!ideaId) {
      return Response.json({ error: 'Idea ID is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch the idea to get its project_id for membership check
    const { data: idea } = await supabase
      .from('ideas')
      .select('project_id')
      .eq('id', ideaId)
      .single()

    if (!idea) {
      return Response.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Verify user belongs to the project
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', idea.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Fetch connections where this idea is the source OR target (bidirectional)
    const { data: outgoing } = await supabase
      .from('idea_connections')
      .select('*')
      .eq('source_idea_id', ideaId)

    const { data: incoming } = await supabase
      .from('idea_connections')
      .select('*')
      .eq('target_idea_id', ideaId)

    // Build a list of connected idea IDs with connection info
    const connections: {
      id: string
      connection_type: string
      connected_idea_id: string
      direction: 'outgoing' | 'incoming'
    }[] = []

    for (const conn of outgoing || []) {
      connections.push({
        id: conn.id,
        connection_type: conn.connection_type,
        connected_idea_id: conn.target_idea_id,
        direction: 'outgoing',
      })
    }

    for (const conn of incoming || []) {
      connections.push({
        id: conn.id,
        connection_type: conn.connection_type,
        connected_idea_id: conn.source_idea_id,
        direction: 'incoming',
      })
    }

    if (connections.length === 0) {
      return Response.json([])
    }

    // Fetch connected idea details
    const connectedIdeaIds = connections.map((c) => c.connected_idea_id)
    const { data: connectedIdeas } = await supabase
      .from('ideas')
      .select('id, title, body, status, created_by, created_at')
      .in('id', connectedIdeaIds)

    // Fetch creator profiles for connected ideas
    const creatorIds = [...new Set((connectedIdeas || []).map((i) => i.created_by))]
    const { data: profiles } = creatorIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', creatorIds)
      : { data: [] }

    const profilesMap = new Map(
      (profiles || []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }])
    )
    const ideasMap = new Map((connectedIdeas || []).map((i) => [i.id, i]))

    // Build enriched response
    const enriched = connections.map((conn) => {
      const connIdea = ideasMap.get(conn.connected_idea_id)
      return {
        id: conn.id,
        connection_type: conn.connection_type,
        direction: conn.direction,
        connected_idea: connIdea
          ? {
              id: connIdea.id,
              title: connIdea.title,
              body: connIdea.body,
              status: connIdea.status,
              created_at: connIdea.created_at,
              creator: profilesMap.get(connIdea.created_by) || null,
            }
          : null,
      }
    })

    return Response.json(enriched)
  } catch (error) {
    return handleAuthError(error)
  }
}
