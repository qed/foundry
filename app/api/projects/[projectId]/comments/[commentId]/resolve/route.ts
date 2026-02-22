import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function POST(
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

    // Fetch comment
    const { data: comment } = await supabase
      .from('comments')
      .select('id, is_resolved')
      .eq('id', commentId)
      .eq('project_id', projectId)
      .is('parent_comment_id', null)
      .is('deleted_at', null)
      .single()

    if (!comment) {
      return Response.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Toggle resolved
    const { data: updated, error } = await supabase
      .from('comments')
      .update({ is_resolved: !comment.is_resolved })
      .eq('id', commentId)
      .select()
      .single()

    if (error) {
      console.error('Error resolving comment:', error)
      return Response.json({ error: 'Failed to update' }, { status: 500 })
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}
