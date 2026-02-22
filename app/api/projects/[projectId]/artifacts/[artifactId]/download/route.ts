import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/artifacts/[artifactId]/download
 * Generate a signed download URL for the artifact.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; artifactId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, artifactId } = await params
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

    const { data: artifact } = await supabase
      .from('artifacts')
      .select('name, storage_path')
      .eq('id', artifactId)
      .eq('project_id', projectId)
      .single()

    if (!artifact || !artifact.storage_path) {
      return Response.json({ error: 'Artifact not found' }, { status: 404 })
    }

    // Create signed URL (valid for 1 hour)
    const { data: signedUrl, error } = await supabase.storage
      .from('artifacts')
      .createSignedUrl(artifact.storage_path, 3600, {
        download: artifact.name,
      })

    if (error || !signedUrl) {
      return Response.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    return Response.json({ url: signedUrl.signedUrl, name: artifact.name })
  } catch (err) {
    return handleAuthError(err)
  }
}
