import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

const VALID_STATUSES = ['acknowledged', 'resolved'] as const

/**
 * POST /api/projects/[projectId]/work-orders/[woId]/sync-alerts/bulk-update
 * Bulk update sync alert statuses.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; woId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, woId } = await params
    const body = await request.json()
    const supabase = createServiceClient()

    const { alert_ids, status } = body as { alert_ids: string[]; status: string }

    if (!alert_ids || !Array.isArray(alert_ids) || alert_ids.length === 0) {
      return Response.json({ error: 'alert_ids array is required' }, { status: 400 })
    }

    if (!status || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return Response.json({ error: 'Invalid status. Must be: acknowledged or resolved' }, { status: 400 })
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

    const updates: Record<string, unknown> = { status }
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString()
      updates.resolved_by = user.id
    }

    const { data, error } = await supabase
      .from('wo_sync_alerts')
      .update(updates)
      .in('id', alert_ids)
      .eq('work_order_id', woId)
      .eq('project_id', projectId)
      .select()

    if (error) {
      console.error('Error bulk updating sync alerts:', error)
      return Response.json({ error: 'Failed to update sync alerts' }, { status: 500 })
    }

    return Response.json({ updated_count: data?.length || 0, alerts: data || [] })
  } catch (err) {
    return handleAuthError(err)
  }
}
