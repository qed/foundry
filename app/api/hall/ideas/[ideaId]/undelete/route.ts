import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { IdeaStatus } from '@/types/database'

const VALID_RESTORE_STATUSES: IdeaStatus[] = ['raw', 'developing', 'mature']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const user = await requireAuth()
    const { ideaId } = await params

    if (!ideaId) {
      return Response.json({ error: 'Idea ID is required' }, { status: 400 })
    }

    const { previousStatus } = await request.json()

    if (!previousStatus || !VALID_RESTORE_STATUSES.includes(previousStatus as IdeaStatus)) {
      return Response.json(
        { error: 'Valid previousStatus is required (raw, developing, or mature)' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Fetch idea
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('id, project_id, status')
      .eq('id', ideaId)
      .single()

    if (ideaError || !idea) {
      return Response.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Only allow undelete of archived ideas
    if (idea.status !== 'archived') {
      return Response.json({ error: 'Idea is not archived' }, { status: 400 })
    }

    // Verify access
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', idea.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Restore status
    const { error: updateError } = await supabase
      .from('ideas')
      .update({
        status: previousStatus as IdeaStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ideaId)

    if (updateError) {
      console.error('Error restoring idea:', updateError)
      return Response.json({ error: 'Failed to restore idea' }, { status: 500 })
    }

    return Response.json({ id: ideaId, status: previousStatus })
  } catch (error) {
    return handleAuthError(error)
  }
}
