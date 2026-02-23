import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const supabase = createServiceClient()

    // Count unread first
    let countQuery = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (projectId) {
      countQuery = countQuery.eq('project_id', projectId)
    }

    const { count } = await countQuery

    // Update all to read
    let updateQuery = supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (projectId) {
      updateQuery = updateQuery.eq('project_id', projectId)
    }

    const { error } = await updateQuery

    if (error) {
      console.error('Error marking notifications read:', error)
      return Response.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
    }

    return Response.json({ marked_count: count || 0 })
  } catch (err) {
    return handleAuthError(err)
  }
}
