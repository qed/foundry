import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; commentId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, commentId } = await params
    const body = await request.json()
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

    // Verify comment exists and belongs to this user
    const { data: existing } = await supabase
      .from('comments')
      .select('id, author_id')
      .eq('id', commentId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (!existing) {
      return Response.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existing.author_id !== user.id) {
      return Response.json({ error: 'Can only edit your own comments' }, { status: 403 })
    }

    const updates: Record<string, string> = {}
    if (body.content && typeof body.content === 'string' && body.content.trim()) {
      updates.content = body.content.trim()
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', commentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      return Response.json({ error: 'Failed to update' }, { status: 500 })
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; commentId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, commentId } = await params
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

    // Verify comment exists and belongs to this user
    const { data: existing } = await supabase
      .from('comments')
      .select('id, author_id')
      .eq('id', commentId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (!existing) {
      return Response.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existing.author_id !== user.id) {
      return Response.json({ error: 'Can only delete your own comments' }, { status: 403 })
    }

    // Soft delete
    const { error } = await supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)

    if (error) {
      console.error('Error deleting comment:', error)
      return Response.json({ error: 'Failed to delete' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
