import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enrichFeedback } from '@/lib/agent/enrich-feedback'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; feedbackId: string }> }
) {
  const user = await requireAuth()
  const { projectId, feedbackId } = await params
  const supabase = await createServiceClient()

  // Verify membership
  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Not a project member' }, { status: 403 })
  }

  // Verify feedback belongs to project
  const { data: feedback } = await supabase
    .from('feedback_submissions')
    .select('id')
    .eq('id', feedbackId)
    .eq('project_id', projectId)
    .single()

  if (!feedback) {
    return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
  }

  const enrichment = await enrichFeedback(feedbackId)

  if (!enrichment) {
    return NextResponse.json(
      { error: 'Enrichment failed. Check that ANTHROPIC_API_KEY is configured.' },
      { status: 500 }
    )
  }

  // Return updated feedback with enrichment
  const { data: updated } = await supabase
    .from('feedback_submissions')
    .select('*')
    .eq('id', feedbackId)
    .single()

  return NextResponse.json(updated)
}
