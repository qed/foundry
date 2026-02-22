import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { WorkOrderStatus, WorkOrderPriority, Json } from '@/types/database'

const VALID_STATUSES: WorkOrderStatus[] = ['backlog', 'ready', 'in_progress', 'in_review', 'done']
const VALID_PRIORITIES: WorkOrderPriority[] = ['critical', 'high', 'medium', 'low']

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; workOrderId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, workOrderId } = await params
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

    // Fetch work order
    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', workOrderId)
      .eq('project_id', projectId)
      .single()

    if (error || !workOrder) {
      return Response.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Enrich with related data in parallel
    const enrichments = await Promise.all([
      // Creator profile
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', workOrder.created_by)
        .single(),
      // Assignee profile (if assigned)
      workOrder.assignee_id
        ? supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', workOrder.assignee_id)
            .single()
        : Promise.resolve({ data: null }),
      // Phase (if set)
      workOrder.phase_id
        ? supabase
            .from('phases')
            .select('id, name, status')
            .eq('id', workOrder.phase_id)
            .single()
        : Promise.resolve({ data: null }),
      // Feature node (if linked)
      workOrder.feature_node_id
        ? supabase
            .from('feature_nodes')
            .select('id, title, level')
            .eq('id', workOrder.feature_node_id)
            .single()
        : Promise.resolve({ data: null }),
    ])

    return Response.json({
      ...workOrder,
      creator: enrichments[0].data || null,
      assignee: enrichments[1].data || null,
      phase: enrichments[2].data || null,
      feature_node: enrichments[3].data || null,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; workOrderId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, workOrderId } = await params
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
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    // Fetch current work order for change detection
    const { data: current, error: fetchErr } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', workOrderId)
      .eq('project_id', projectId)
      .single()

    if (fetchErr || !current) {
      return Response.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Build update payload and track changes
    const updates: Record<string, unknown> = {}
    const activities: Array<{ action: string; details: Json }> = []

    if (body.title !== undefined) {
      const title = (body.title || '').trim()
      if (!title || title.length < 3 || title.length > 255) {
        return Response.json(
          { error: 'Title must be between 3 and 255 characters' },
          { status: 400 }
        )
      }
      if (title !== current.title) {
        updates.title = title
        activities.push({
          action: 'title_changed',
          details: { from: current.title, to: title },
        })
      }
    }

    if (body.status !== undefined && body.status !== current.status) {
      if (!VALID_STATUSES.includes(body.status as WorkOrderStatus)) {
        return Response.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
      activities.push({
        action: 'status_changed',
        details: { from: current.status, to: body.status },
      })
    }

    if (body.priority !== undefined && body.priority !== current.priority) {
      if (!VALID_PRIORITIES.includes(body.priority as WorkOrderPriority)) {
        return Response.json({ error: 'Invalid priority' }, { status: 400 })
      }
      updates.priority = body.priority
      activities.push({
        action: 'priority_changed',
        details: { from: current.priority, to: body.priority },
      })
    }

    if (body.assignee_id !== undefined && body.assignee_id !== current.assignee_id) {
      updates.assignee_id = body.assignee_id || null
      activities.push({
        action: body.assignee_id ? 'assigned' : 'unassigned',
        details: { from: current.assignee_id, to: body.assignee_id || null },
      })
    }

    if (body.phase_id !== undefined && body.phase_id !== current.phase_id) {
      updates.phase_id = body.phase_id || null
      activities.push({
        action: 'phase_changed',
        details: { from: current.phase_id, to: body.phase_id || null },
      })
    }

    if (body.feature_node_id !== undefined && body.feature_node_id !== current.feature_node_id) {
      updates.feature_node_id = body.feature_node_id || null
      activities.push({
        action: 'feature_linked',
        details: { from: current.feature_node_id, to: body.feature_node_id || null },
      })
    }

    if (body.description !== undefined && body.description !== current.description) {
      updates.description = body.description || null
      activities.push({
        action: 'description_updated',
        details: {},
      })
    }

    if (body.acceptance_criteria !== undefined && body.acceptance_criteria !== current.acceptance_criteria) {
      updates.acceptance_criteria = body.acceptance_criteria || null
      activities.push({
        action: 'acceptance_criteria_updated',
        details: {},
      })
    }

    if (body.implementation_plan !== undefined && body.implementation_plan !== current.implementation_plan) {
      updates.implementation_plan = body.implementation_plan || null
      activities.push({
        action: 'implementation_plan_updated',
        details: {},
      })
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(current)
    }

    // Update work order
    const { data: updated, error: updateErr } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', workOrderId)
      .select()
      .single()

    if (updateErr) {
      console.error('Error updating work order:', updateErr)
      return Response.json(
        { error: 'Failed to update work order' },
        { status: 500 }
      )
    }

    // Log activities
    if (activities.length > 0) {
      await supabase.from('work_order_activity').insert(
        activities.map((a) => ({
          work_order_id: workOrderId,
          user_id: user.id,
          action: a.action,
          details: a.details,
        }))
      )
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}
