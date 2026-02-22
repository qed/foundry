import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { calculateChangeSize, generateChangeSummary, VERSION_THRESHOLD } from '@/lib/shop/version-diff'

/**
 * GET /api/projects/[projectId]/requirements-documents/[docId]/versions
 * List version history for a document.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, docId } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

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

    // Get total count
    const { count } = await supabase
      .from('requirement_versions')
      .select('id', { count: 'exact', head: true })
      .eq('requirement_doc_id', docId)

    // Fetch versions with user info
    const { data: versions, error } = await supabase
      .from('requirement_versions')
      .select('id, version_number, content, created_by, created_at, change_summary')
      .eq('requirement_doc_id', docId)
      .order('version_number', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching versions:', error)
      return Response.json({ error: 'Failed to fetch versions' }, { status: 500 })
    }

    // Fetch user profiles for the version creators
    const userIds = [...new Set((versions || []).map((v) => v.created_by))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, { id: p.id, name: p.display_name }])
    )

    const enriched = (versions || []).map((v) => ({
      ...v,
      created_by: profileMap.get(v.created_by) || { id: v.created_by, name: 'Unknown' },
    }))

    return Response.json({ total: count || 0, versions: enriched })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * POST /api/projects/[projectId]/requirements-documents/[docId]/versions
 * Create a new version. Called during auto-save when content changes significantly.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, docId } = await params
    const body = await request.json()
    const { content, changeSummary, previousContent } = body

    if (!content || typeof content !== 'string') {
      return Response.json({ error: 'content is required' }, { status: 400 })
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
      .select('id, content')
      .eq('id', docId)
      .eq('project_id', projectId)
      .single()

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if the change is significant enough
    const oldContent = previousContent || doc.content || ''
    const changeSize = calculateChangeSize(oldContent, content)

    if (changeSize < VERSION_THRESHOLD) {
      return Response.json({ skipped: true, reason: 'Change too small', changeSize })
    }

    // Get the latest version number
    const { data: latestVersion } = await supabase
      .from('requirement_versions')
      .select('version_number')
      .eq('requirement_doc_id', docId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersionNumber = (latestVersion?.version_number || 0) + 1
    const summary = changeSummary || generateChangeSummary(oldContent, content)

    const { data: version, error: insertErr } = await supabase
      .from('requirement_versions')
      .insert({
        requirement_doc_id: docId,
        version_number: nextVersionNumber,
        content,
        created_by: user.id,
        change_summary: summary.slice(0, 500),
      })
      .select('id, version_number, created_at, change_summary')
      .single()

    if (insertErr) {
      console.error('Error creating version:', insertErr)
      return Response.json({ error: 'Failed to create version' }, { status: 500 })
    }

    return Response.json(version, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
