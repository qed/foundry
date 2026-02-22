import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { IdeaStatus } from '@/types/database'

const VALID_STATUSES: IdeaStatus[] = ['raw', 'developing', 'mature']

/**
 * PUT /api/hall/bulk/status
 * Change status for multiple ideas.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { projectId, ideaIds, status } = await request.json()

    if (!projectId || !Array.isArray(ideaIds) || ideaIds.length === 0) {
      return Response.json({ error: 'projectId and ideaIds are required' }, { status: 400 })
    }
    if (!status || !VALID_STATUSES.includes(status as IdeaStatus)) {
      return Response.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

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

    // Update all matching ideas (skip promoted/archived)
    const { data: updated, error } = await supabase
      .from('ideas')
      .update({
        status: status as IdeaStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .in('id', ideaIds)
      .in('status', VALID_STATUSES)
      .select('id')

    if (error) {
      console.error('Bulk status error:', error)
      return Response.json({ error: 'Failed to update ideas' }, { status: 500 })
    }

    return Response.json({ updated: updated?.length || 0 })
  } catch (error) {
    return handleAuthError(error)
  }
}
