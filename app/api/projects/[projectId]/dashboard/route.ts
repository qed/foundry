import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
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

    // Parallel fetch core data
    const [woResult, phasesResult, featuresResult, membersResult] = await Promise.all([
      supabase
        .from('work_orders')
        .select('id, title, status, priority, phase_id, feature_node_id, assignee_id, updated_at')
        .eq('project_id', projectId),
      supabase
        .from('phases')
        .select('id, name, status, position')
        .eq('project_id', projectId)
        .order('position', { ascending: true }),
      supabase
        .from('feature_nodes')
        .select('id, title, parent_id, level')
        .eq('project_id', projectId)
        .order('position', { ascending: true }),
      supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId),
    ])

    const workOrders = woResult.data || []
    const phases = phasesResult.data || []
    const features = featuresResult.data || []
    const membersList = membersResult.data || []

    // Fetch recent activity via work order IDs (activity table has no project_id)
    const woIds = workOrders.map((wo) => wo.id)
    let recentActivity: { id: string; work_order_id: string; user_id: string; action: string; details: unknown; created_at: string }[] = []
    if (woIds.length > 0) {
      const { data: actData } = await supabase
        .from('work_order_activity')
        .select('id, work_order_id, user_id, action, details, created_at')
        .in('work_order_id', woIds)
        .order('created_at', { ascending: false })
        .limit(20)
      recentActivity = (actData || []) as typeof recentActivity
    }

    // -- Project-level progress --
    const totalWOs = workOrders.length
    const completedWOs = workOrders.filter((wo) => wo.status === 'done').length
    const projectPercentage = totalWOs > 0 ? Math.round((completedWOs / totalWOs) * 100) : 0

    // -- Phase-level progress --
    const phaseMap = new Map<string, { total: number; completed: number }>()
    for (const wo of workOrders) {
      if (!wo.phase_id) continue
      const entry = phaseMap.get(wo.phase_id) || { total: 0, completed: 0 }
      entry.total++
      if (wo.status === 'done') entry.completed++
      phaseMap.set(wo.phase_id, entry)
    }

    const phaseProgress = phases.map((p) => {
      const stats = phaseMap.get(p.id) || { total: 0, completed: 0 }
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        total: stats.total,
        completed: stats.completed,
        percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }
    })

    // -- Feature progress (tree structure) --
    const featureWOMap = new Map<string, { total: number; completed: number }>()
    for (const wo of workOrders) {
      if (!wo.feature_node_id) continue
      const entry = featureWOMap.get(wo.feature_node_id) || { total: 0, completed: 0 }
      entry.total++
      if (wo.status === 'done') entry.completed++
      featureWOMap.set(wo.feature_node_id, entry)
    }

    // Build flat feature list with progress (include parent_id for client-side tree building)
    const featureProgress = features.map((f) => {
      const stats = featureWOMap.get(f.id) || { total: 0, completed: 0 }
      return {
        id: f.id,
        title: f.title,
        parent_id: f.parent_id,
        level: f.level,
        total: stats.total,
        completed: stats.completed,
        percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }
    })

    // -- Recent activity enriched with profiles and WO titles --
    const activityUserIds = new Set<string>()
    const activityWOIds = new Set<string>()
    for (const a of recentActivity) {
      activityUserIds.add(a.user_id)
      activityWOIds.add(a.work_order_id)
    }

    const profileMap: Record<string, string> = {}
    if (activityUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', Array.from(activityUserIds))
      for (const p of profiles || []) {
        profileMap[p.id] = p.display_name || 'Unknown'
      }
    }

    // WO title map from already-fetched data
    const woTitleMap = new Map<string, string>()
    for (const wo of workOrders) {
      woTitleMap.set(wo.id, wo.title)
    }

    const enrichedActivity = recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      created_at: a.created_at,
      user_name: profileMap[a.user_id] || 'Unknown',
      work_order_title: woTitleMap.get(a.work_order_id) || 'Unknown',
    }))

    // -- Team workload --
    const memberUserIds = membersList.map((m) => m.user_id)
    const memberProfileMap: Record<string, string> = {}
    if (memberUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', memberUserIds)
      for (const p of profiles || []) {
        memberProfileMap[p.id] = p.display_name || 'Unknown'
      }
    }

    const workloadMap = new Map<string, { assigned: number; completed: number; in_progress: number }>()
    for (const wo of workOrders) {
      if (!wo.assignee_id) continue
      const entry = workloadMap.get(wo.assignee_id) || { assigned: 0, completed: 0, in_progress: 0 }
      entry.assigned++
      if (wo.status === 'done') entry.completed++
      if (wo.status === 'in_progress') entry.in_progress++
      workloadMap.set(wo.assignee_id, entry)
    }

    const teamWorkload = Array.from(workloadMap.entries()).map(([userId, stats]) => ({
      user_id: userId,
      name: memberProfileMap[userId] || 'Unknown',
      assigned: stats.assigned,
      completed: stats.completed,
      in_progress: stats.in_progress,
    })).sort((a, b) => b.assigned - a.assigned)

    // -- Blockers: high/critical priority in backlog/ready, or items in_review for extended time --
    const blockers = workOrders
      .filter((wo) => {
        if ((wo.priority === 'critical' || wo.priority === 'high') &&
            (wo.status === 'backlog' || wo.status === 'ready')) {
          return true
        }
        return false
      })
      .map((wo) => ({
        id: wo.id,
        title: wo.title,
        status: wo.status,
        priority: wo.priority,
      }))
      .slice(0, 10)

    // -- Status distribution --
    const statusCounts: Record<string, number> = {
      backlog: 0,
      ready: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    }
    for (const wo of workOrders) {
      statusCounts[wo.status] = (statusCounts[wo.status] || 0) + 1
    }

    return Response.json({
      project_progress: {
        total: totalWOs,
        completed: completedWOs,
        percentage: projectPercentage,
      },
      status_counts: statusCounts,
      phases: phaseProgress,
      features: featureProgress,
      recent_activity: enrichedActivity,
      team_workload: teamWorkload,
      blockers,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
