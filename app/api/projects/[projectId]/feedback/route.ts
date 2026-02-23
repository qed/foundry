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

    // Single or comma-separated values
    const statusParam = searchParams.get('status')
    const categoryParam = searchParams.get('category')
    const priorityTierParam = searchParams.get('priorityTier')
    const search = searchParams.get('search')
    const tagsParam = searchParams.get('tags')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const scoreMin = searchParams.get('scoreMin')
    const scoreMax = searchParams.get('scoreMax')
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

    // Status filter: single value or comma-separated
    if (statusParam) {
      const statuses = statusParam.split(',').filter((s) => VALID_STATUSES.includes(s as FeedbackStatus))
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0] as FeedbackStatus)
      } else if (statuses.length > 1) {
        query = query.in('status', statuses as FeedbackStatus[])
      }
    }

    // Category filter: single value or comma-separated
    if (categoryParam) {
      const categories = categoryParam.split(',').filter((c) => VALID_CATEGORIES.includes(c as FeedbackCategory))
      if (categories.length === 1) {
        query = query.eq('category', categories[0] as FeedbackCategory)
      } else if (categories.length > 1) {
        query = query.in('category', categories as FeedbackCategory[])
      }
    }

    // Priority tier filter
    if (priorityTierParam) {
      const validTiers = ['low', 'medium', 'high', 'critical']
      const tiers = priorityTierParam.split(',').filter((t) => validTiers.includes(t))
      if (tiers.length === 1) {
        query = query.eq('priority_tier', tiers[0] as 'low' | 'medium' | 'high' | 'critical')
      } else if (tiers.length > 1) {
        query = query.in('priority_tier', tiers as ('low' | 'medium' | 'high' | 'critical')[])
      }
    }

    // Text search on content
    if (search) {
      query = query.ilike('content', `%${search}%`)
    }

    // Tags filter: OR logic — feedback with ANY of the selected tags
    if (tagsParam) {
      const tags = tagsParam.split(',').map((t) => t.trim()).filter(Boolean)
      if (tags.length > 0) {
        query = query.overlaps('tags', tags)
      }
    }

    // Date range filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      // Include the entire end date by adding time component
      query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)
    }

    // Score range filters
    if (scoreMin) {
      const min = parseInt(scoreMin, 10)
      if (!isNaN(min) && min > 0) {
        query = query.gte('score', min)
      }
    }
    if (scoreMax) {
      const max = parseInt(scoreMax, 10)
      if (!isNaN(max) && max < 100) {
        query = query.lte('score', max)
      }
    }

    // Apply sort
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else if (sort === 'highest_score') {
      query = query.order('score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
    } else if (sort === 'highest_priority') {
      query = query.order('priority_score', { ascending: false })
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
