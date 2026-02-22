import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; nodeId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, nodeId } = await params
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    // Verify node exists and is deleted
    const { data: node } = await supabase
      .from('feature_nodes')
      .select('id, deleted_at')
      .eq('id', nodeId)
      .eq('project_id', projectId)
      .not('deleted_at', 'is', null)
      .single()

    if (!node) {
      return Response.json(
        { error: 'Node not found or not deleted' },
        { status: 404 }
      )
    }

    // Restore: set deleted_at to null
    const { data: restored, error } = await supabase
      .from('feature_nodes')
      .update({ deleted_at: null })
      .eq('id', nodeId)
      .select()
      .single()

    if (error) {
      console.error('Error restoring feature node:', error)
      return Response.json(
        { error: 'Failed to restore feature node' },
        { status: 500 }
      )
    }

    return Response.json(restored)
  } catch (err) {
    return handleAuthError(err)
  }
}
