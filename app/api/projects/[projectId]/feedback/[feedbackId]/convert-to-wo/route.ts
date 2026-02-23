import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { WorkOrderPriority } from '@/types/database'

const VALID_PRIORITIES: WorkOrderPriority[] = ['critical', 'high', 'medium', 'low']

/**
 * POST /api/projects/[projectId]/feedback/[feedbackId]/convert-to-wo
 * Creates a work order from feedback, links them, and marks feedback as converted.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; feedbackId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, feedbackId } = await params
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
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Verify feedback exists and isn't already converted
    const { data: feedback } = await supabase
      .from('feedback_submissions')
      .select('id, converted_to_work_order_id')
      .eq('id', feedbackId)
      .eq('project_id', projectId)
      .single()

    if (!feedback) {
      return Response.json({ error: 'Feedback not found' }, { status: 404 })
    }

    if (feedback.converted_to_work_order_id) {
      return Response.json({ error: 'Feedback already converted to a work order' }, { status: 409 })
    }

    // Validate fields
    const title = (body.title || '').trim()
    if (!title || title.length < 3 || title.length > 255) {
      return Response.json({ error: 'Title must be between 3 and 255 characters' }, { status: 400 })
    }

    const description = (body.description || '').trim()
    if (description.length < 10) {
      return Response.json({ error: 'Description must be at least 10 characters' }, { status: 400 })
    }

    const priority = body.priority || 'medium'
    if (!VALID_PRIORITIES.includes(priority as WorkOrderPriority)) {
      return Response.json({ error: 'Invalid priority' }, { status: 400 })
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

    // Create work order
    const { data: workOrder, error: woErr } = await supabase
      .from('work_orders')
      .insert({
        project_id: projectId,
        title,
        description,
        priority: priority as WorkOrderPriority,
        assignee_id: body.assignee_id || null,
        status: 'backlog' as const,
        position,
        created_by: user.id,
      })
      .select()
      .single()

    if (woErr) {
      console.error('Error creating work order from feedback:', woErr)
      return Response.json({ error: 'Failed to create work order' }, { status: 500 })
    }

    // Link feedback → work order and mark as converted
    const { data: updatedFeedback, error: fbErr } = await supabase
      .from('feedback_submissions')
      .update({
        converted_to_work_order_id: workOrder.id,
        status: 'converted' as const,
      })
      .eq('id', feedbackId)
      .select()
      .single()

    if (fbErr) {
      console.error('Error linking feedback to work order:', fbErr)
      // Work order was created but link failed — don't fail the whole request
    }

    // Log activity on the work order
    await supabase.from('work_order_activity').insert({
      work_order_id: workOrder.id,
      user_id: user.id,
      action: 'created',
      details: { source: 'feedback_conversion', feedback_id: feedbackId },
    })

    return Response.json({
      workOrder,
      feedback: updatedFeedback || null,
    }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
