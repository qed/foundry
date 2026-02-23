import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; phaseId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, phaseId } = await params
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

    // Get phase
    const { data: phase } = await supabase
      .from('phases')
      .select('*')
      .eq('id', phaseId)
      .eq('project_id', projectId)
      .single()

    if (!phase) {
      return Response.json({ error: 'Phase not found' }, { status: 404 })
    }

    // Get all work orders in this phase
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('id, status, created_at, updated_at')
      .eq('phase_id', phaseId)
      .eq('project_id', projectId)

    const wos = workOrders ?? []
    const total = wos.length

    if (total === 0) {
      return Response.json({
        phase,
        total: 0,
        completed: 0,
        remaining: 0,
        velocity: 0,
        estimatedCompletion: null,
        dataPoints: [],
        statusBreakdown: { backlog: 0, ready: 0, in_progress: 0, in_review: 0, done: 0 },
      })
    }

    // Status breakdown
    const statusBreakdown = { backlog: 0, ready: 0, in_progress: 0, in_review: 0, done: 0 }
    for (const wo of wos) {
      const s = wo.status as keyof typeof statusBreakdown
      if (s in statusBreakdown) statusBreakdown[s]++
    }

    const completed = statusBreakdown.done
    const remaining = total - completed

    // Build burndown data points from work order activity log
    // Each "done" transition gives us a data point
    const { data: activities } = await supabase
      .from('work_order_activity')
      .select('work_order_id, created_at, details')
      .in('work_order_id', wos.map((wo) => wo.id))
      .order('created_at', { ascending: true })

    // Build daily completion history
    const phaseStartDate = new Date(phase.created_at)
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    // Track completion events by date
    const completionsByDate = new Map<string, number>()

    if (activities) {
      for (const act of activities) {
        const details = act.details as Record<string, unknown> | null
        if (!details) continue

        // Look for status changes to 'done'
        const newStatus = details.new_status || details.status
        if (newStatus === 'done') {
          const date = new Date(act.created_at).toISOString().split('T')[0]
          completionsByDate.set(date, (completionsByDate.get(date) || 0) + 1)
        }
      }
    }

    // Also check work orders directly — if they're 'done' but no activity shows it,
    // use their updated_at as the completion date
    const woIdsWithActivity = new Set(
      (activities ?? [])
        .filter((a) => {
          const d = a.details as Record<string, unknown> | null
          return d && (d.new_status === 'done' || d.status === 'done')
        })
        .map((a) => a.work_order_id)
    )

    for (const wo of wos) {
      if (wo.status === 'done' && !woIdsWithActivity.has(wo.id)) {
        const date = new Date(wo.updated_at).toISOString().split('T')[0]
        completionsByDate.set(date, (completionsByDate.get(date) || 0) + 1)
      }
    }

    // Generate data points: day-by-day from phase start to today
    const dataPoints: { date: string; remaining: number; ideal: number }[] = []
    const startStr = phaseStartDate.toISOString().split('T')[0]
    const endStr = today.toISOString().split('T')[0]

    let cumulativeCompleted = 0
    const cursor = new Date(startStr)
    const totalDays = Math.max(1, Math.ceil((today.getTime() - phaseStartDate.getTime()) / (1000 * 60 * 60 * 24)))

    while (cursor.toISOString().split('T')[0] <= endStr) {
      const dateStr = cursor.toISOString().split('T')[0]
      cumulativeCompleted += completionsByDate.get(dateStr) || 0

      const dayIndex = Math.ceil((cursor.getTime() - phaseStartDate.getTime()) / (1000 * 60 * 60 * 24))
      const idealRemaining = Math.max(0, total - (total * dayIndex) / totalDays)

      dataPoints.push({
        date: dateStr,
        remaining: total - cumulativeCompleted,
        ideal: Math.round(idealRemaining * 10) / 10,
      })

      cursor.setDate(cursor.getDate() + 1)
    }

    // Calculate velocity (avg completions per day over last 7 days)
    const recentDays = 7
    const recentStart = new Date(today)
    recentStart.setDate(recentStart.getDate() - recentDays)
    const recentStartStr = recentStart.toISOString().split('T')[0]

    let recentCompletions = 0
    for (const [date, count] of completionsByDate.entries()) {
      if (date >= recentStartStr) {
        recentCompletions += count
      }
    }
    const velocity = Math.round((recentCompletions / recentDays) * 100) / 100

    // Estimated completion
    let estimatedCompletion: string | null = null
    if (velocity > 0 && remaining > 0) {
      const daysToComplete = Math.ceil(remaining / velocity)
      const estDate = new Date()
      estDate.setDate(estDate.getDate() + daysToComplete)
      estimatedCompletion = estDate.toISOString().split('T')[0]
    }

    return Response.json({
      phase,
      total,
      completed,
      remaining,
      velocity,
      estimatedCompletion,
      dataPoints,
      statusBreakdown,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
