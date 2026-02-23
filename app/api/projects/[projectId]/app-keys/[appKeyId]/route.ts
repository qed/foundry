import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

// PATCH — revoke or update status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; appKeyId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, appKeyId } = await params
    const body = await request.json()
    const { action } = body
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

    // Verify key belongs to project
    const { data: existing } = await supabase
      .from('app_keys')
      .select('id, status')
      .eq('id', appKeyId)
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      return Response.json({ error: 'App key not found' }, { status: 404 })
    }

    if (action === 'revoke') {
      if (existing.status === 'revoked') {
        return Response.json({ error: 'Key is already revoked' }, { status: 400 })
      }

      const { data: updated, error } = await supabase
        .from('app_keys')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq('id', appKeyId)
        .select('id, name, environment, description, status, created_at, revoked_at')
        .single()

      if (error) {
        return Response.json({ error: 'Failed to revoke key' }, { status: 500 })
      }

      return Response.json({ key: updated })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return handleAuthError(err)
  }
}

// DELETE — only revoked keys older than 7 days
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; appKeyId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, appKeyId } = await params
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

    // Verify key belongs to project and is revoked
    const { data: existing } = await supabase
      .from('app_keys')
      .select('id, status, revoked_at')
      .eq('id', appKeyId)
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      return Response.json({ error: 'App key not found' }, { status: 404 })
    }

    if (existing.status !== 'revoked') {
      return Response.json({ error: 'Only revoked keys can be deleted' }, { status: 400 })
    }

    // Check if revoked more than 7 days ago
    if (existing.revoked_at) {
      const revokedDate = new Date(existing.revoked_at)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      if (revokedDate > sevenDaysAgo) {
        return Response.json(
          { error: 'Revoked keys can only be deleted after 7 days' },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from('app_keys')
      .delete()
      .eq('id', appKeyId)

    if (error) {
      return Response.json({ error: 'Failed to delete key' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
