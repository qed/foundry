import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

/**
 * GET /api/projects/[projectId]/feedback/analytics
 * Real-time feedback analytics aggregation.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const supabase = createServiceClient()

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Parse date range from query params
    const url = new URL(request.url)
    const range = url.searchParams.get('range') || '30' // days
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    let startDate: string
    let endDate: string

    if (dateFrom && dateTo) {
      startDate = dateFrom
      endDate = dateTo
    } else {
      const days = range === 'all' ? 365 * 5 : parseInt(range, 10) || 30
      const now = new Date()
      const start = new Date(now)
      start.setDate(start.getDate() - days)
      startDate = start.toISOString()
      endDate = now.toISOString()
    }

    // Fetch all feedback in range
    const { data: allFeedback, error: fetchError } = await supabase
      .from('feedback_submissions')
      .select('id, category, status, score, created_at, tags')
      .eq('project_id', projectId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Analytics fetch error:', fetchError)
      return Response.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
    }

    const items = allFeedback || []

    // 1. Volume over time (daily buckets)
    const volumeByDay: Record<string, number> = {}
    for (const item of items) {
      const day = item.created_at.split('T')[0]
      volumeByDay[day] = (volumeByDay[day] || 0) + 1
    }

    // Fill gaps in date range
    const volumeTimeSeries: { date: string; count: number; movingAvg: number }[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    const cursor = new Date(start)
    while (cursor <= end) {
      const day = cursor.toISOString().split('T')[0]
      volumeTimeSeries.push({ date: day, count: volumeByDay[day] || 0, movingAvg: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    // Compute 7-day moving average
    for (let i = 0; i < volumeTimeSeries.length; i++) {
      const windowStart = Math.max(0, i - 6)
      let sum = 0
      for (let j = windowStart; j <= i; j++) {
        sum += volumeTimeSeries[j].count
      }
      volumeTimeSeries[i].movingAvg = Math.round((sum / (i - windowStart + 1)) * 10) / 10
    }

    // 2. Category distribution
    const categoryDist: Record<string, number> = {}
    for (const item of items) {
      categoryDist[item.category] = (categoryDist[item.category] || 0) + 1
    }
    const categoryData = Object.entries(categoryDist)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // 3. Status distribution
    const statusDist: Record<string, number> = {}
    for (const item of items) {
      statusDist[item.status] = (statusDist[item.status] || 0) + 1
    }
    const statusData = Object.entries(statusDist)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // 4. Score distribution (histogram buckets)
    const scoreBuckets = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '21-40', min: 21, max: 40, count: 0 },
      { range: '41-60', min: 41, max: 60, count: 0 },
      { range: '61-80', min: 61, max: 80, count: 0 },
      { range: '81-100', min: 81, max: 100, count: 0 },
    ]
    let scoredCount = 0
    let scoreSum = 0
    for (const item of items) {
      if (item.score != null) {
        scoredCount++
        scoreSum += item.score
        const bucket = scoreBuckets.find((b) => item.score! >= b.min && item.score! <= b.max)
        if (bucket) bucket.count++
      }
    }

    // 5. Average score over time
    const scoreByDay: Record<string, { sum: number; count: number }> = {}
    for (const item of items) {
      if (item.score != null) {
        const day = item.created_at.split('T')[0]
        if (!scoreByDay[day]) scoreByDay[day] = { sum: 0, count: 0 }
        scoreByDay[day].sum += item.score
        scoreByDay[day].count++
      }
    }
    const avgScoreTimeSeries: { date: string; avgScore: number; count: number }[] = []
    for (const point of volumeTimeSeries) {
      const dayData = scoreByDay[point.date]
      if (dayData && dayData.count > 0) {
        avgScoreTimeSeries.push({
          date: point.date,
          avgScore: Math.round((dayData.sum / dayData.count) * 10) / 10,
          count: dayData.count,
        })
      }
    }

    // 6. Top tags
    const tagCounts: Record<string, number> = {}
    for (const item of items) {
      if (item.tags && Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }
      }
    }
    const topTags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return Response.json({
      totalItems: items.length,
      avgScore: scoredCount > 0 ? Math.round((scoreSum / scoredCount) * 10) / 10 : null,
      scoredCount,
      volumeTimeSeries,
      categoryDistribution: categoryData,
      statusDistribution: statusData,
      scoreDistribution: scoreBuckets.map((b) => ({ range: b.range, count: b.count })),
      avgScoreTimeSeries,
      topTags,
      dateRange: { from: startDate, to: endDate },
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
