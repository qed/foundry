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
    const sort = searchParams.get('sort') || 'newest'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
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
      .select('*', { count: 'exact' })
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

    // Apply sort
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else if (sort === 'highest_score') {
      query = query.order('score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: feedback, error, count } = await query

    if (error) {
      console.error('Error fetching feedback:', error)
      return Response.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      )
    }

    return Response.json({
      feedback: feedback || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
