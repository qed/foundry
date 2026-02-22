import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { IdeaStatus } from '@/types/database'

const VALID_RESTORE_STATUSES: IdeaStatus[] = ['raw', 'developing', 'mature']

/**
 * POST /api/hall/bulk/unarchive
 * Restore archived ideas to their previous statuses.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { projectId, previousStatuses } = await request.json()

    if (!projectId || !Array.isArray(previousStatuses) || previousStatuses.length === 0) {
      return Response.json(
        { error: 'projectId and previousStatuses are required' },
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

    // Restore each idea to its previous status
    let restored = 0
    for (const { id, status } of previousStatuses) {
      if (!VALID_RESTORE_STATUSES.includes(status as IdeaStatus)) continue

      const { error } = await supabase
        .from('ideas')
        .update({
          status: status as IdeaStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'archived')

      if (!error) restored++
    }

    return Response.json({ restored })
  } catch (error) {
    return handleAuthError(error)
  }
}
