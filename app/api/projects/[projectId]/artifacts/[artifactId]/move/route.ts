import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/projects/[projectId]/artifacts/[artifactId]/move
 * Move an artifact to a different folder.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; artifactId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, artifactId } = await params
    const { folder_id } = await request.json()

    const supabase = createServiceClient()

    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // If moving to a folder, verify it exists in the same project
    if (folder_id) {
      const { data: folder } = await supabase
        .from('artifact_folders')
        .select('id')
        .eq('id', folder_id)
        .eq('project_id', projectId)
        .single()

      if (!folder) {
        return Response.json({ error: 'Destination folder not found' }, { status: 404 })
      }
    }

    const { data: artifact, error } = await supabase
      .from('artifacts')
      .update({ folder_id: folder_id || null })
      .eq('id', artifactId)
      .eq('project_id', projectId)
      .select('id, folder_id')
      .single()

    if (error || !artifact) {
      return Response.json({ error: 'Failed to move artifact' }, { status: 500 })
    }

    return Response.json(artifact)
  } catch (err) {
    return handleAuthError(err)
  }
}
