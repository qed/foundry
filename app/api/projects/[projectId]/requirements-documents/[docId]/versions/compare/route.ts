import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { computeDiff, stripHtml } from '@/lib/shop/version-diff'

/**
 * GET /api/projects/[projectId]/requirements-documents/[docId]/versions/compare
 * Compare two versions by version number.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, docId } = await params
    const { searchParams } = new URL(request.url)
    const fromVn = parseInt(searchParams.get('from') || '', 10)
    const toVn = parseInt(searchParams.get('to') || '', 10)

    if (isNaN(fromVn) || isNaN(toVn) || fromVn < 1 || toVn < 1) {
      return Response.json({ error: '"from" and "to" version numbers required' }, { status: 400 })
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

    // Verify doc exists
    const { data: doc } = await supabase
      .from('requirements_documents')
      .select('id')
      .eq('id', docId)
      .eq('project_id', projectId)
      .single()

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 })
    }

    // Fetch both versions
    const { data: versions, error } = await supabase
      .from('requirement_versions')
      .select('version_number, content')
      .eq('requirement_doc_id', docId)
      .in('version_number', [fromVn, toVn])

    if (error || !versions || versions.length < 2) {
      return Response.json({ error: 'One or both versions not found' }, { status: 404 })
    }

    const fromVersion = versions.find((v) => v.version_number === fromVn)
    const toVersion = versions.find((v) => v.version_number === toVn)

    if (!fromVersion || !toVersion) {
      return Response.json({ error: 'Version not found' }, { status: 404 })
    }

    const fromText = stripHtml(fromVersion.content || '')
    const toText = stripHtml(toVersion.content || '')
    const diff = computeDiff(fromText, toText)

    return Response.json({
      from: fromVn,
      to: toVn,
      diff,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
