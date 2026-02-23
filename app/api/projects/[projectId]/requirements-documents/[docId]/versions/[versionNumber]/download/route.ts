import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { stripHtml } from '@/lib/shop/version-diff'

/**
 * GET /api/projects/[projectId]/requirements-documents/[docId]/versions/[versionNumber]/download
 * Download a specific version as a text file.
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
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch the document title
    const { data: doc } = await supabase
      .from('requirements_documents')
      .select('id, title')
      .eq('id', docId)
      .eq('project_id', projectId)
      .single()

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 })
    }

    // Fetch the version
    const { data: version, error } = await supabase
      .from('requirement_versions')
      .select('version_number, content, created_by, created_at, change_summary')
      .eq('requirement_doc_id', docId)
      .eq('version_number', versionNumber)
      .single()

    if (error || !version) {
      return Response.json({ error: 'Version not found' }, { status: 404 })
    }

    // Fetch creator name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', version.created_by)
      .single()

    // Build the download content
    const plainText = stripHtml(version.content)
    const header = [
      `# ${doc.title}`,
      `Version: ${version.version_number}`,
      `Date: ${new Date(version.created_at).toISOString()}`,
      `Author: ${profile?.display_name || 'Unknown'}`,
      version.change_summary ? `Changes: ${version.change_summary}` : null,
      '',
      '---',
      '',
    ].filter(Boolean).join('\n')

    const body = header + plainText

    // Sanitize filename
    const safeTitle = doc.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 50)
    const filename = `${safeTitle}-v${versionNumber}.md`

    return new Response(body, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
