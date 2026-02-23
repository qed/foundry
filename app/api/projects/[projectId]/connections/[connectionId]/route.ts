import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; connectionId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, connectionId } = await params
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

    const { error } = await supabase
      .from('entity_connections')
      .delete()
      .eq('id', connectionId)
      .eq('project_id', projectId)

    if (error) {
      console.error('Error deleting connection:', error)
      return Response.json({ error: 'Failed to delete connection' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
