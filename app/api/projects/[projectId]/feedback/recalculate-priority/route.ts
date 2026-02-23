import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { recalculateProjectPriority } from '@/lib/feedback/priority-scorer'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

/**
 * POST /api/projects/[projectId]/feedback/recalculate-priority
 * Recalculate priority scores for all non-archived feedback. Leaders only.
 */
export async function POST(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const supabase = createServiceClient()

    const { data: membership } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'leader') {
      return Response.json({ error: 'Only project leaders can trigger recalculation' }, { status: 403 })
    }

    const count = await recalculateProjectPriority(projectId)

    return Response.json({ success: true, recalculated: count })
  } catch (err) {
    return handleAuthError(err)
  }
}
