import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/hall/bulk/archive
 * Soft delete (archive) multiple ideas.
 * Returns previous statuses for undo capability.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { projectId, ideaIds } = await request.json()

    if (!projectId || !Array.isArray(ideaIds) || ideaIds.length === 0) {
      return Response.json({ error: 'projectId and ideaIds are required' }, { status: 400 })
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

    // Fetch current statuses for undo
    const { data: ideas } = await supabase
      .from('ideas')
      .select('id, status')
      .eq('project_id', projectId)
      .in('id', ideaIds)
      .neq('status', 'archived')

    if (!ideas || ideas.length === 0) {
      return Response.json({ error: 'No archivable ideas found' }, { status: 400 })
    }

    const previousStatuses = ideas.map((i) => ({ id: i.id, status: i.status }))
    const archivableIds = ideas.map((i) => i.id)

    // Archive all
    const { error } = await supabase
      .from('ideas')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .in('id', archivableIds)

    if (error) {
      console.error('Bulk archive error:', error)
      return Response.json({ error: 'Failed to archive ideas' }, { status: 500 })
    }

    return Response.json({
      archived: archivableIds.length,
      previousStatuses,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
