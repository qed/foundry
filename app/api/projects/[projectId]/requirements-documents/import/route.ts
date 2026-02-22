import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { markdownToHtml, plainTextToHtml, extractTitleFromMarkdown } from '@/lib/shop/import-utils'
import type { DocType } from '@/types/database'

const VALID_DOC_TYPES: DocType[] = ['product_overview', 'feature_requirement', 'technical_requirement']

/**
 * POST /api/projects/[projectId]/requirements-documents/import
 * Import a requirements document from uploaded file content.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { content: rawContent, fileName, docType, title: providedTitle, featureNodeId } = body

    if (!rawContent || typeof rawContent !== 'string') {
      return Response.json({ error: 'content is required' }, { status: 400 })
    }

    if (!docType || !VALID_DOC_TYPES.includes(docType as DocType)) {
      return Response.json({ error: 'Valid docType is required' }, { status: 400 })
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

    // If linking to a feature node, validate it exists
    if (featureNodeId) {
      const { data: node } = await supabase
        .from('feature_nodes')
        .select('id, project_id')
        .eq('id', featureNodeId)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .single()

      if (!node) {
        return Response.json({ error: 'Feature node not found' }, { status: 404 })
      }
    }

    // Convert content to HTML based on file extension
    const ext = (fileName || '').split('.').pop()?.toLowerCase() || 'md'
    let htmlContent: string

    if (ext === 'md' || ext === 'markdown') {
      htmlContent = await markdownToHtml(rawContent)
    } else if (ext === 'txt') {
      htmlContent = plainTextToHtml(rawContent)
    } else {
      // Treat as markdown by default
      htmlContent = await markdownToHtml(rawContent)
    }

    // Determine title
    const fallbackName = (fileName || 'Imported Document').replace(/\.[^/.]+$/, '')
    const title = providedTitle || extractTitleFromMarkdown(rawContent, fallbackName)

    // Create the document
    const { data: doc, error: insertErr } = await supabase
      .from('requirements_documents')
      .insert({
        project_id: projectId,
        feature_node_id: featureNodeId || null,
        doc_type: docType as DocType,
        title,
        content: htmlContent,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('Error importing document:', insertErr)
      return Response.json({ error: 'Failed to import document' }, { status: 500 })
    }

    return Response.json(doc, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
