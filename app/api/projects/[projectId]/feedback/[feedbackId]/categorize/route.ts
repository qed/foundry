import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { categorizeFeedback } from '@/lib/agent/categorize-feedback'

/**
 * POST /api/projects/[projectId]/feedback/[feedbackId]/categorize
 * Manually trigger AI auto-categorization for a feedback item.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; feedbackId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, feedbackId } = await params
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

    // Verify feedback exists and belongs to project
    const { data: feedback } = await supabase
      .from('feedback_submissions')
      .select('id, category, ai_suggested')
      .eq('id', feedbackId)
      .eq('project_id', projectId)
      .single()

    if (!feedback) {
      return Response.json({ error: 'Feedback not found' }, { status: 404 })
    }

    // Reset to uncategorized so the agent can re-process
    if (feedback.category !== 'uncategorized') {
      await supabase
        .from('feedback_submissions')
        .update({
          category: 'uncategorized' as const,
          ai_suggested: false,
          categorization_reasoning: null,
        })
        .eq('id', feedbackId)
    }

    // Run categorization
    await categorizeFeedback(feedbackId)

    // Fetch the updated record
    const { data: updated } = await supabase
      .from('feedback_submissions')
      .select('*')
      .eq('id', feedbackId)
      .single()

    return Response.json(updated || { id: feedbackId })
  } catch (err) {
    return handleAuthError(err)
  }
}
