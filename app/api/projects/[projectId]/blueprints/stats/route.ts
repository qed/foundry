import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/blueprints/stats
 * Return blueprint status counts and metrics.
 */
export async function GET(
  _request: Request,
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
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Fetch all blueprints for stats
    const { data: blueprints, error } = await supabase
      .from('blueprints')
      .select('status, created_at')
      .eq('project_id', projectId)

    if (error) {
      console.error('Error fetching blueprint stats:', error)
      return Response.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const byStatus = { draft: 0, in_review: 0, approved: 0, implemented: 0 }
    let totalAgeDays = 0
    const now = Date.now()

    for (const bp of blueprints || []) {
      const status = bp.status as keyof typeof byStatus
      if (status in byStatus) byStatus[status]++
      totalAgeDays += (now - new Date(bp.created_at).getTime()) / (1000 * 60 * 60 * 24)
    }

    const total = (blueprints || []).length

    return Response.json({
      by_status: byStatus,
      total,
      avg_age_days: total > 0 ? Math.round(totalAgeDays / total) : 0,
      pending_review: byStatus.in_review,
      ready_for_implementation: byStatus.approved,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
