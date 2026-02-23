import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { WorkOrderStatus, WorkOrderPriority } from '@/types/database'

const VALID_STATUSES: WorkOrderStatus[] = ['backlog', 'ready', 'in_progress', 'in_review', 'done']
const VALID_PRIORITIES: WorkOrderPriority[] = ['critical', 'high', 'medium', 'low']

/**
 * PATCH /api/projects/[projectId]/work-orders/bulk-update
 * Bulk update multiple work orders with the same field changes.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { work_order_ids, updates } = body as {
      work_order_ids: string[]
      updates: {
        status?: WorkOrderStatus
        priority?: WorkOrderPriority
        assignee_id?: string | null
        phase_id?: string | null
      }
    }

    if (!work_order_ids || !Array.isArray(work_order_ids) || work_order_ids.length === 0) {
      return Response.json({ error: 'work_order_ids is required' }, { status: 400 })
    }

    if (work_order_ids.length > 200) {
      return Response.json({ error: 'Maximum 200 work orders per bulk update' }, { status: 400 })
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return Response.json({ error: 'updates is required with at least one field' }, { status: 400 })
    }

    // Validate fields
    if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (updates.priority !== undefined && !VALID_PRIORITIES.includes(updates.priority)) {
      return Response.json({ error: 'Invalid priority' }, { status: 400 })
    }

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

    // Build update payload
    const updatePayload: Record<string, unknown> = {}
    const activityAction: string[] = []

    if (updates.status !== undefined) {
      updatePayload.status = updates.status
      activityAction.push('status_changed')
    }
    if (updates.priority !== undefined) {
      updatePayload.priority = updates.priority
      activityAction.push('priority_changed')
    }
    if (updates.assignee_id !== undefined) {
      updatePayload.assignee_id = updates.assignee_id || null
      activityAction.push(updates.assignee_id ? 'assigned' : 'unassigned')
    }
    if (updates.phase_id !== undefined) {
      updatePayload.phase_id = updates.phase_id || null
      activityAction.push('phase_changed')
    }

    // Bulk update
    const { data: updated, error: updateErr } = await supabase
      .from('work_orders')
      .update(updatePayload)
      .eq('project_id', projectId)
      .in('id', work_order_ids)
      .select()

    if (updateErr) {
      console.error('Bulk update error:', updateErr)
      return Response.json({ error: 'Failed to update work orders' }, { status: 500 })
    }

    // Log activity for each work order
    const activityRows = work_order_ids.flatMap((woId) =>
      activityAction.map((action) => ({
        work_order_id: woId,
        user_id: user.id,
        action,
        details: { source: 'bulk_update', ...updates },
      }))
    )

    if (activityRows.length > 0) {
      await supabase.from('work_order_activity').insert(activityRows)
    }

    return Response.json({
      updated_count: updated?.length || 0,
      updated_work_orders: updated || [],
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
