import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { parseTreeJson, parseTreeCsv } from '@/lib/shop/import-utils'

/**
 * POST /api/projects/[projectId]/feature-nodes/import
 * Import a feature tree from JSON or CSV file content.
 * Returns parsed nodes for preview before bulk-creating.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { content, format } = body

    if (!content || typeof content !== 'string') {
      return Response.json({ error: 'content is required' }, { status: 400 })
    }

    if (!format || !['json', 'csv'].includes(format)) {
      return Response.json({ error: 'format must be "json" or "csv"' }, { status: 400 })
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

    // Parse the file content
    let nodes
    try {
      nodes = format === 'json' ? parseTreeJson(content) : parseTreeCsv(content)
    } catch (parseErr) {
      const message = parseErr instanceof Error ? parseErr.message : 'Failed to parse file'
      return Response.json({ error: message }, { status: 400 })
    }

    if (nodes.length === 0) {
      return Response.json({ error: 'No nodes found in file' }, { status: 400 })
    }

    if (nodes.length > 200) {
      return Response.json({ error: 'Maximum 200 nodes per import' }, { status: 400 })
    }

    return Response.json({
      preview: nodes,
      count: nodes.length,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
