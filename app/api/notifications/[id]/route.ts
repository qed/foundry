import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const supabase = createServiceClient()

    // Verify ownership
    const { data: notification } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!notification) {
      return Response.json({ error: 'Notification not found' }, { status: 404 })
    }
    if (notification.user_id !== user.id) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.is_read === 'boolean') {
      updates.is_read = body.is_read
      updates.read_at = body.is_read ? new Date().toISOString() : null
    }

    const { data: updated, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select('id, is_read, read_at')
      .single()

    if (error) {
      console.error('Error updating notification:', error)
      return Response.json({ error: 'Failed to update notification' }, { status: 500 })
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const supabase = createServiceClient()

    // Verify ownership
    const { data: notification } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!notification) {
      return Response.json({ error: 'Notification not found' }, { status: 404 })
    }
    if (notification.user_id !== user.id) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting notification:', error)
      return Response.json({ error: 'Failed to delete notification' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
