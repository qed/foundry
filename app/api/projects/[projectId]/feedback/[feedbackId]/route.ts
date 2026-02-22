import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { FeedbackStatus, FeedbackCategory } from '@/types/database'

const VALID_STATUSES: FeedbackStatus[] = ['new', 'triaged', 'converted', 'archived']
const VALID_CATEGORIES: FeedbackCategory[] = ['bug', 'feature_request', 'ux_issue', 'performance', 'other', 'uncategorized']

/**
 * GET /api/projects/[projectId]/feedback/[feedbackId]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; feedbackId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, feedbackId } = await params
    const supabase = createServiceClient()

    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    const { data: feedback, error } = await supabase
      .from('feedback_submissions')
      .select('*')
      .eq('id', feedbackId)
      .eq('project_id', projectId)
      .single()

    if (error || !feedback) {
      return Response.json({ error: 'Feedback not found' }, { status: 404 })
    }

    return Response.json(feedback)
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * PATCH /api/projects/[projectId]/feedback/[feedbackId]
 * Update status, category, tags, or score.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; feedbackId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, feedbackId } = await params
    const body = await request.json()
    const supabase = createServiceClient()

    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Verify feedback exists
    const { data: existing } = await supabase
      .from('feedback_submissions')
      .select('id')
      .eq('id', feedbackId)
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      return Response.json({ error: 'Feedback not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return Response.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }

    if (body.category !== undefined) {
      if (!VALID_CATEGORIES.includes(body.category)) {
        return Response.json({ error: 'Invalid category' }, { status: 400 })
      }
      updates.category = body.category
    }

    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) {
        return Response.json({ error: 'Tags must be an array' }, { status: 400 })
      }
      updates.tags = body.tags
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('feedback_submissions')
      .update(updates)
      .eq('id', feedbackId)
      .select()
      .single()

    if (updateErr) {
      console.error('Error updating feedback:', updateErr)
      return Response.json({ error: 'Failed to update feedback' }, { status: 500 })
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}
