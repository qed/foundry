import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/artifacts/[id]/content
 * Retrieve full extracted text content for an artifact.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const supabase = createServiceClient()

    // Fetch artifact
    const { data: artifact, error } = await supabase
      .from('artifacts')
      .select('id, name, file_type, content_text, processing_status, project_id')
      .eq('id', id)
      .single()

    if (error || !artifact) {
      return Response.json({ error: 'Artifact not found' }, { status: 404 })
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', artifact.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // If still extracting, return 202
    if (artifact.processing_status === 'extracting_text') {
      return Response.json(
        {
          id: artifact.id,
          name: artifact.name,
          file_type: artifact.file_type,
          processing_status: artifact.processing_status,
          content_text: null,
          content_length: 0,
        },
        { status: 202 }
      )
    }

    return Response.json({
      id: artifact.id,
      name: artifact.name,
      file_type: artifact.file_type,
      content_text: artifact.content_text,
      processing_status: artifact.processing_status,
      content_length: artifact.content_text?.length || 0,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
