import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { FeatureStatus, FeatureLevel } from '@/types/database'

/**
 * GET /api/projects/[projectId]/feature-nodes/stats
 * Returns level counts, status breakdown, and completion metrics.
 */
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

    // Fetch all non-deleted nodes (just level + status)
    const { data: nodes } = await supabase
      .from('feature_nodes')
      .select('level, status')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    if (!nodes || nodes.length === 0) {
      return Response.json({
        projectId,
        totalNodes: 0,
        epicCount: 0,
        featureCount: 0,
        subfeatureCount: 0,
        taskCount: 0,
        statusBreakdown: { not_started: 0, in_progress: 0, complete: 0, blocked: 0 },
        completionPercent: 0,
        inProgressPercent: 0,
        blockedPercent: 0,
        blockedNodeCount: 0,
      })
    }

    const levelCounts: Record<FeatureLevel, number> = { epic: 0, feature: 0, sub_feature: 0, task: 0 }
    const statusCounts: Record<FeatureStatus, number> = { not_started: 0, in_progress: 0, complete: 0, blocked: 0 }

    for (const node of nodes) {
      levelCounts[node.level as FeatureLevel]++
      statusCounts[node.status as FeatureStatus]++
    }

    const total = nodes.length
    const completionPercent = Math.round((statusCounts.complete / total) * 100)
    const inProgressPercent = Math.round((statusCounts.in_progress / total) * 100)
    const blockedPercent = Math.round((statusCounts.blocked / total) * 100)

    return Response.json({
      projectId,
      totalNodes: total,
      epicCount: levelCounts.epic,
      featureCount: levelCounts.feature,
      subfeatureCount: levelCounts.sub_feature,
      taskCount: levelCounts.task,
      statusBreakdown: statusCounts,
      completionPercent,
      inProgressPercent,
      blockedPercent,
      blockedNodeCount: statusCounts.blocked,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
