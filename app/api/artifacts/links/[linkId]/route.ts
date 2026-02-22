import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * DELETE /api/artifacts/links/[linkId]
 * Remove an artifact-entity link.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const user = await requireAuth()
    const { linkId } = await params
    const supabase = createServiceClient()

    // Get the link to check ownership
    const { data: link } = await supabase
      .from('artifact_entity_links')
      .select('id, artifact_id, created_by')
      .eq('id', linkId)
      .single()

    if (!link) {
      return Response.json({ error: 'Link not found' }, { status: 404 })
    }

    // Verify user has access (creator or project leader)
    const { data: artifact } = await supabase
      .from('artifacts')
      .select('project_id')
      .eq('id', link.artifact_id)
      .single()

    if (!artifact) {
      return Response.json({ error: 'Artifact not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', artifact.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Only creator or leaders can delete
    if (link.created_by !== user.id && membership.role !== 'leader') {
      return Response.json({ error: 'Not authorized to remove this link' }, { status: 403 })
    }

    const { error } = await supabase
      .from('artifact_entity_links')
      .delete()
      .eq('id', linkId)

    if (error) {
      return Response.json({ error: 'Failed to remove link' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
