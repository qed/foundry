import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { buildAllFrdsMarkdown, wrapInStyledHtml } from '@/lib/shop/export-utils'

/**
 * POST /api/projects/[projectId]/requirements-documents/export-all
 * Export all FRDs for a project as concatenated markdown or styled HTML.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json().catch(() => ({}))
    const format = body.format || 'markdown'

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

    // Get project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    const projectName = project?.name || 'Project'

    // Fetch all requirements documents
    const { data: docs, error } = await supabase
      .from('requirements_documents')
      .select('title, content, doc_type, feature_node_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching documents:', error)
      return Response.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    const allDocs = (docs || []).map((d) => ({
      title: d.title,
      content: d.content || '',
      doc_type: d.doc_type,
      feature_node_id: d.feature_node_id,
    }))

    const safeProjectName = projectName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'requirements'

    if (format === 'markdown') {
      const md = buildAllFrdsMarkdown(allDocs, projectName)
      return new Response(md, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeProjectName}_requirements.md"`,
        },
      })
    }

    if (format === 'html' || format === 'pdf') {
      // Build concatenated HTML
      const sections = allDocs
        .map((doc) => `<h2>${doc.title}</h2>\n${doc.content}\n<hr>`)
        .join('\n')
      const toc = allDocs
        .map((doc, i) => `<li>${i + 1}. ${doc.title}</li>`)
        .join('\n')
      const fullHtml = `<h1>${projectName} — Requirements</h1>\n<h2>Table of Contents</h2>\n<ol>${toc}</ol>\n<hr>\n${sections}`
      const html = wrapInStyledHtml(`${projectName} Requirements`, fullHtml)

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeProjectName}_requirements.html"`,
        },
      })
    }

    return Response.json({ error: 'Invalid format. Use: markdown, html, pdf' }, { status: 400 })
  } catch (err) {
    return handleAuthError(err)
  }
}
