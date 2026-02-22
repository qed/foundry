import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { htmlToMarkdown, wrapInStyledHtml } from '@/lib/shop/export-utils'

/**
 * GET /api/projects/[projectId]/requirements-documents/[docId]/export
 * Export a single requirements document in markdown, html, or pdf format.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, docId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'markdown'

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

    // Fetch document
    const { data: doc, error } = await supabase
      .from('requirements_documents')
      .select('id, title, content, doc_type, created_at, updated_at')
      .eq('id', docId)
      .eq('project_id', projectId)
      .single()

    if (error || !doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 })
    }

    const safeTitle = doc.title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'document'

    if (format === 'markdown') {
      const md = `# ${doc.title}\n\n${htmlToMarkdown(doc.content || '')}`
      return new Response(md, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeTitle}.md"`,
        },
      })
    }

    if (format === 'html' || format === 'pdf') {
      // PDF format serves styled HTML that can be printed to PDF
      const html = wrapInStyledHtml(doc.title, `<h1>${doc.title}</h1>\n${doc.content || ''}`)
      const ext = format === 'pdf' ? 'html' : 'html'
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeTitle}.${ext}"`,
        },
      })
    }

    return Response.json({ error: 'Invalid format. Use: markdown, html, pdf' }, { status: 400 })
  } catch (err) {
    return handleAuthError(err)
  }
}
