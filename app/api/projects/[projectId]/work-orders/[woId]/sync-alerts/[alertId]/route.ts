import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

const VALID_STATUSES = ['new', 'acknowledged', 'resolved'] as const

/**
 * PATCH /api/projects/[projectId]/work-orders/[woId]/sync-alerts/[alertId]
 * Update a sync alert status (acknowledge or resolve).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; woId: string; alertId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, woId, alertId } = await params
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

    const { status } = body
    if (!status || !VALID_STATUSES.includes(status)) {
      return Response.json({ error: 'Invalid status. Must be: new, acknowledged, or resolved' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { status }

    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString()
      updates.resolved_by = user.id
    }

    const { data: updated, error } = await supabase
      .from('wo_sync_alerts')
      .update(updates)
      .eq('id', alertId)
      .eq('work_order_id', woId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error || !updated) {
      console.error('Error updating sync alert:', error)
      return Response.json({ error: 'Failed to update sync alert' }, { status: 500 })
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}
