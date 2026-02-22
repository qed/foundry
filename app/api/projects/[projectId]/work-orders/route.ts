import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { WorkOrderPriority } from '@/types/database'

const VALID_PRIORITIES: WorkOrderPriority[] = ['critical', 'high', 'medium', 'low']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const phaseId = searchParams.get('phaseId')
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

    let query = supabase
      .from('work_orders')
      .select('*')
      .eq('project_id', projectId)

    if (phaseId) {
      query = query.eq('phase_id', phaseId)
    }

    const { data: workOrders, error } = await query.order('position', { ascending: true })

    if (error) {
      console.error('Error fetching work orders:', error)
      return Response.json(
        { error: 'Failed to fetch work orders' },
        { status: 500 }
      )
    }

    return Response.json({ workOrders: workOrders || [] })
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
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

    // Validate title
    const title = (body.title || '').trim()
    if (!title || title.length < 3 || title.length > 255) {
      return Response.json(
        { error: 'Title must be between 3 and 255 characters' },
        { status: 400 }
      )
    }

    // Validate priority
    const priority = body.priority || 'medium'
    if (!VALID_PRIORITIES.includes(priority as WorkOrderPriority)) {
      return Response.json(
        { error: 'Invalid priority' },
        { status: 400 }
      )
    }

    // Auto-calculate position
    const { data: maxPos } = await supabase
      .from('work_orders')
      .select('position')
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = (maxPos?.position ?? 0) + 1

    const { data: workOrder, error: insertErr } = await supabase
      .from('work_orders')
      .insert({
        project_id: projectId,
        title,
        description: body.description || null,
        acceptance_criteria: body.acceptance_criteria || null,
        priority: priority as WorkOrderPriority,
        assignee_id: body.assignee_id || null,
        phase_id: body.phase_id || null,
        feature_node_id: body.feature_node_id || null,
        status: 'backlog' as const,
        position,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('Error creating work order:', insertErr)
      return Response.json(
        { error: 'Failed to create work order' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('work_order_activity').insert({
      work_order_id: workOrder.id,
      user_id: user.id,
      action: 'created',
      details: {},
    })

    return Response.json(workOrder, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
