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
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    // Fetch all work orders for aggregation
    const { data: workOrders, error: woErr } = await supabase
      .from('work_orders')
      .select('id, status, phase_id, feature_node_id')
      .eq('project_id', projectId)

    if (woErr) {
      console.error('Error fetching work orders for progress:', woErr)
      return Response.json({ error: 'Failed to compute progress' }, { status: 500 })
    }

    const wos = workOrders || []

    // Project-level progress
    const projectTotal = wos.length
    const projectCompleted = wos.filter((wo) => wo.status === 'done').length
    const projectPercentage = projectTotal > 0 ? Math.round((projectCompleted / projectTotal) * 100) : 0

    // Phase-level progress
    const phaseMap = new Map<string, { total: number; completed: number }>()
    for (const wo of wos) {
      if (!wo.phase_id) continue
      const entry = phaseMap.get(wo.phase_id) || { total: 0, completed: 0 }
      entry.total++
      if (wo.status === 'done') entry.completed++
      phaseMap.set(wo.phase_id, entry)
    }

    // Fetch phase names
    const { data: phases } = await supabase
      .from('phases')
      .select('id, name, status')
      .eq('project_id', projectId)
      .order('position', { ascending: true })

    const phaseProgress = (phases || []).map((p) => {
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

    // Feature-level progress
    const featureMap = new Map<string, { total: number; completed: number }>()
    for (const wo of wos) {
      if (!wo.feature_node_id) continue
      const entry = featureMap.get(wo.feature_node_id) || { total: 0, completed: 0 }
      entry.total++
      if (wo.status === 'done') entry.completed++
      featureMap.set(wo.feature_node_id, entry)
    }

    // Fetch feature names for features that have work orders
    const featureIds = Array.from(featureMap.keys())
    let featureProgress: { id: string; title: string; total: number; completed: number; percentage: number }[] = []
    if (featureIds.length > 0) {
      const { data: features } = await supabase
        .from('feature_nodes')
        .select('id, title')
        .in('id', featureIds)

      featureProgress = (features || []).map((f) => {
        const stats = featureMap.get(f.id) || { total: 0, completed: 0 }
        return {
          id: f.id,
          title: f.title,
          total: stats.total,
          completed: stats.completed,
          percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        }
      })
    }

    return Response.json({
      project: {
        total: projectTotal,
        completed: projectCompleted,
        percentage: projectPercentage,
      },
      phases: phaseProgress,
      features: featureProgress,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
