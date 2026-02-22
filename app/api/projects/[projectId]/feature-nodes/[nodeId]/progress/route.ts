import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { FeatureStatus } from '@/types/database'

/**
 * GET /api/projects/[projectId]/feature-nodes/[nodeId]/progress
 * Get progress metrics for a node based on its direct children.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; nodeId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, nodeId } = await params

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

    // Fetch direct children
    const { data: children } = await supabase
      .from('feature_nodes')
      .select('id, status')
      .eq('parent_id', nodeId)
      .eq('project_id', projectId)
      .is('deleted_at', null)

    if (!children) {
      return Response.json({
        nodeId,
        totalChildren: 0,
        completeChildren: 0,
        inProgressChildren: 0,
        blockedChildren: 0,
        notStartedChildren: 0,
        completionPercent: 0,
        statusBreakdown: {
          not_started: 0,
          in_progress: 0,
          complete: 0,
          blocked: 0,
        },
      })
    }

    const breakdown: Record<FeatureStatus, number> = {
      not_started: 0,
      in_progress: 0,
      complete: 0,
      blocked: 0,
    }

    for (const child of children) {
      const s = child.status as FeatureStatus
      breakdown[s]++
    }

    const total = children.length
    const percent = total > 0 ? Math.round((breakdown.complete / total) * 100) : 0

    return Response.json({
      nodeId,
      totalChildren: total,
      completeChildren: breakdown.complete,
      inProgressChildren: breakdown.in_progress,
      blockedChildren: breakdown.blocked,
      notStartedChildren: breakdown.not_started,
      completionPercent: percent,
      statusBreakdown: breakdown,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
