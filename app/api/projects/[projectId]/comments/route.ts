import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { Comment } from '@/types/database'

type EntityType = Comment['entity_type']
const VALID_ENTITY_TYPES: EntityType[] = ['idea', 'feature_node', 'requirement_doc', 'blueprint', 'work_order', 'feedback']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const filter = searchParams.get('filter') || 'all'
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

    // Fetch top-level comments (no parent)
    let query = supabase
      .from('comments')
      .select('*')
      .eq('project_id', projectId)
      .eq('entity_type', entityType as EntityType)
      .eq('entity_id', entityId)
      .is('parent_comment_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (filter === 'open') {
      query = query.eq('is_resolved', false)
    } else if (filter === 'resolved') {
      query = query.eq('is_resolved', true)
    }

    const { data: comments, error } = await query

    if (error) {
      console.error('Error fetching comments:', error)
      return Response.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    // Fetch all replies for these comments
    const commentIds = (comments || []).map((c) => c.id)
    let replies: typeof comments = []
    if (commentIds.length > 0) {
      const { data: replyData } = await supabase
        .from('comments')
        .select('*')
        .in('parent_comment_id', commentIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      replies = replyData || []
    }

    // Fetch author profiles
    const authorIds = new Set<string>()
    for (const c of comments || []) authorIds.add(c.author_id)
    for (const r of replies) authorIds.add(r.author_id)

    const profileMap: Record<string, { display_name: string | null }> = {}
    if (authorIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', Array.from(authorIds))
      for (const p of profiles || []) {
        profileMap[p.id] = { display_name: p.display_name }
      }
    }

    // Build threaded response
    const replyMap: Record<string, typeof replies> = {}
    for (const r of replies) {
      if (!r.parent_comment_id) continue
      if (!replyMap[r.parent_comment_id]) replyMap[r.parent_comment_id] = []
      replyMap[r.parent_comment_id].push(r)
    }

    const enriched = (comments || []).map((c) => ({
      ...c,
      author: {
        id: c.author_id,
        name: profileMap[c.author_id]?.display_name || 'Unknown',
      },
      replies: (replyMap[c.id] || []).map((r) => ({
        ...r,
        author: {
          id: r.author_id,
          name: profileMap[r.author_id]?.display_name || 'Unknown',
        },
      })),
    }))

    return Response.json({
      total: enriched.length,
      comments: enriched,
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
    const { entityType, entityId, content, parentCommentId, anchorData } = body
    const supabase = createServiceClient()

    if (!entityType || !VALID_ENTITY_TYPES.includes(entityType)) {
      return Response.json({ error: 'Valid entityType is required' }, { status: 400 })
    }
    if (!entityId) {
      return Response.json({ error: 'entityId is required' }, { status: 400 })
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return Response.json({ error: 'Content is required' }, { status: 400 })
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

    // If replying, verify parent exists
    if (parentCommentId) {
      const { data: parent } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parentCommentId)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .single()
      if (!parent) {
        return Response.json({ error: 'Parent comment not found' }, { status: 404 })
      }
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        project_id: projectId,
        entity_type: entityType as EntityType,
        entity_id: entityId,
        content: content.trim(),
        author_id: user.id,
        parent_comment_id: parentCommentId || null,
        anchor_data: anchorData || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return Response.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    // Fetch author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    return Response.json({
      ...comment,
      author: {
        id: user.id,
        name: profile?.display_name || 'Unknown',
      },
      replies: [],
    }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
