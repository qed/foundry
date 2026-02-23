import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const supabase = createServiceClient()

    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const isRead = searchParams.get('is_read')
    const type = searchParams.get('type')
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (isRead === 'true') {
      query = query.eq('is_read', true)
    } else if (isRead === 'false') {
      query = query.eq('is_read', false)
    }
    if (type) {
      query = query.eq('type', type as 'mention' | 'comment' | 'assignment' | 'status_change' | 'feedback')
    }

    const { data: notifications, count, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return Response.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Fetch triggered_by user profiles
    const triggerUserIds = new Set<string>()
    for (const n of notifications || []) {
      if (n.triggered_by_user_id) triggerUserIds.add(n.triggered_by_user_id)
    }

    const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {}
    if (triggerUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', Array.from(triggerUserIds))
      for (const p of profiles || []) {
        profileMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }
      }
    }

    const enriched = (notifications || []).map((n) => ({
      ...n,
      triggered_by_user: n.triggered_by_user_id
        ? {
            id: n.triggered_by_user_id,
            name: profileMap[n.triggered_by_user_id]?.display_name || 'Unknown',
            avatar_url: profileMap[n.triggered_by_user_id]?.avatar_url || null,
          }
        : null,
    }))

    return Response.json({
      notifications: enriched,
      total_count: count || 0,
      unread_count: unreadCount || 0,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
