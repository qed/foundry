import { NextRequest } from 'next/server'
import { getProjectAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params
    await getProjectAndValidateAccess(projectId)

    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    const action = url.searchParams.get('action')
    const entityType = url.searchParams.get('entity_type')
    const entityId = url.searchParams.get('entity_id')
    const fromDate = url.searchParams.get('from_date')
    const toDate = url.searchParams.get('to_date')
    const search = url.searchParams.get('search')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const supabase = createServiceClient()

    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (userId) query = query.eq('user_id', userId)
    if (action) query = query.eq('action', action)
    if (entityType) query = query.eq('entity_type', entityType)
    if (entityId) query = query.eq('entity_id', entityId)
    if (fromDate) query = query.gte('created_at', fromDate)
    if (toDate) query = query.lte('created_at', toDate)
    if (search) query = query.ilike('action', `%${search}%`)

    const { data: activities, count, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Enrich with user profiles
    const userIds = [...new Set((activities || []).map((a) => a.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds)

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    )

    const enriched = (activities || []).map((a) => ({
      ...a,
      user: profileMap.get(a.user_id) || null,
    }))

    return Response.json({
      activities: enriched,
      total_count: count ?? 0,
      hasMore: (offset + limit) < (count ?? 0),
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
