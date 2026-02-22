import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/projects/[projectId]/requirements-documents/[docId]/versions/[versionNumber]/restore
 * Restore document to a specific version. Creates a new version noting the restoration.
 */
export async function POST(
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

    // Fetch the version to restore
    const { data: targetVersion, error: versionErr } = await supabase
      .from('requirement_versions')
      .select('version_number, content, change_summary')
      .eq('requirement_doc_id', docId)
      .eq('version_number', versionNumber)
      .single()

    if (versionErr || !targetVersion) {
      return Response.json({ error: 'Version not found' }, { status: 404 })
    }

    // Update the document content
    const { error: updateErr } = await supabase
      .from('requirements_documents')
      .update({ content: targetVersion.content })
      .eq('id', docId)

    if (updateErr) {
      console.error('Error updating document:', updateErr)
      return Response.json({ error: 'Failed to restore document' }, { status: 500 })
    }

    // Get latest version number for the new restore version
    const { data: latestVersion } = await supabase
      .from('requirement_versions')
      .select('version_number')
      .eq('requirement_doc_id', docId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const newVersionNumber = (latestVersion?.version_number || 0) + 1
    const summary = `Restored to v${versionNumber}${targetVersion.change_summary ? ` (${targetVersion.change_summary})` : ''}`

    // Create new version recording the restore
    const { data: newVersion, error: insertErr } = await supabase
      .from('requirement_versions')
      .insert({
        requirement_doc_id: docId,
        version_number: newVersionNumber,
        content: targetVersion.content,
        created_by: user.id,
        change_summary: summary.slice(0, 500),
      })
      .select('id, version_number, created_at, change_summary')
      .single()

    if (insertErr) {
      console.error('Error creating restore version:', insertErr)
      // Document was already restored, just return success without version
      return Response.json({
        restored_version: versionNumber,
        new_version: null,
        change_summary: summary,
      })
    }

    return Response.json({
      restored_version: versionNumber,
      new_version: newVersion.version_number,
      change_summary: newVersion.change_summary,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
