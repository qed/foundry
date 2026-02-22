import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/requirements-documents/[docId]/versions/[versionNumber]
 * Fetch a specific version by version number.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string; versionNumber: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, docId, versionNumber: vnStr } = await params
    const versionNumber = parseInt(vnStr, 10)

    if (isNaN(versionNumber) || versionNumber < 1) {
      return Response.json({ error: 'Invalid version number' }, { status: 400 })
    }

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

    // Verify doc exists and belongs to project
    const { data: doc } = await supabase
      .from('requirements_documents')
      .select('id')
      .eq('id', docId)
      .eq('project_id', projectId)
      .single()

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 })
    }

    // Fetch the specific version
    const { data: version, error } = await supabase
      .from('requirement_versions')
      .select('id, version_number, content, created_by, created_at, change_summary')
      .eq('requirement_doc_id', docId)
      .eq('version_number', versionNumber)
      .single()

    if (error || !version) {
      return Response.json({ error: 'Version not found' }, { status: 404 })
    }

    // Fetch creator profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', version.created_by)
      .single()

    return Response.json({
      ...version,
      created_by: profile
        ? { id: profile.id, name: profile.display_name }
        : { id: version.created_by, name: 'Unknown' },
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
