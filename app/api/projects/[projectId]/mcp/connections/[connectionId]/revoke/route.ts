import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function POST(
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

    // Revoke the connection
    const { data: connection, error } = await supabase
      .from('mcp_connections')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .eq('id', connectionId)
      .eq('project_id', projectId)
      .eq('status', 'active')
      .select('id, status, revoked_at')
      .single()

    if (error || !connection) {
      return Response.json({ error: 'Connection not found or already revoked' }, { status: 404 })
    }

    return Response.json({ success: true, revoked_at: connection.revoked_at })
  } catch (err) {
    return handleAuthError(err)
  }
}
