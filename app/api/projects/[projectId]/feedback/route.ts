import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { FeedbackStatus, FeedbackCategory } from '@/types/database'

const VALID_STATUSES: FeedbackStatus[] = ['new', 'triaged', 'converted', 'archived']
const VALID_CATEGORIES: FeedbackCategory[] = ['bug', 'feature_request', 'ux_issue', 'performance', 'other', 'uncategorized']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
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
      .from('feedback_submissions')
      .select('*')
      .eq('project_id', projectId)

    if (status && VALID_STATUSES.includes(status as FeedbackStatus)) {
      query = query.eq('status', status as FeedbackStatus)
    }
    if (category && VALID_CATEGORIES.includes(category as FeedbackCategory)) {
      query = query.eq('category', category as FeedbackCategory)
    }
    if (search) {
      query = query.ilike('content', `%${search}%`)
    }

    const { data: feedback, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching feedback:', error)
      return Response.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      )
    }

    return Response.json({ feedback: feedback || [] })
  } catch (err) {
    return handleAuthError(err)
  }
}
