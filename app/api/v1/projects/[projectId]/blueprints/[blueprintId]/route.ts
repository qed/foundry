import { NextRequest } from 'next/server'
import { authenticateApiKey, apiError } from '@/lib/mcp/auth'
import { hasScope } from '@/lib/mcp/keys'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

/**
 * GET /api/v1/projects/[projectId]/blueprints/[blueprintId]
 * Get full blueprint details including content (MCP API key auth).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; blueprintId: string }> }
) {
  const connection = await authenticateApiKey(request)
  if (!connection) return apiError('Invalid or revoked API key', 401)

  const { projectId, blueprintId } = await params
  if (connection.project_id !== projectId) {
    return apiError('API key not authorized for this project', 403)
  }

  if (!hasScope('read:blueprints', connection.scopes)) {
    return apiError('Insufficient scope: read:blueprints required', 403)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const supabase = createServiceClient()

  const { data: blueprint, error } = await supabase
    .from('blueprints')
    .select('id, title, blueprint_type, status, content, feature_node_id, created_at, updated_at')
    .eq('id', blueprintId)
    .eq('project_id', projectId)
    .single()

  if (error || !blueprint) {
    return Response.json({ error: 'Blueprint not found' }, { status: 404, headers })
  }

  // Convert TipTap JSON content to plain text for easier consumption
  const contentText = extractPlainText(blueprint.content as Json)

  return Response.json({
    ...blueprint,
    content_text: contentText,
  }, { headers })
}

/**
 * Recursively extract plain text from TipTap/ProseMirror JSON content.
 */
function extractPlainText(content: Json): string {
  if (!content || typeof content !== 'object') return String(content || '')
  if (Array.isArray(content)) return content.map(extractPlainText).join('')

  const node = content as Record<string, Json>
  const parts: string[] = []

  if (node.text && typeof node.text === 'string') {
    parts.push(node.text)
  }

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      parts.push(extractPlainText(child))
    }
  }

  const type = node.type as string | undefined
  if (type === 'paragraph' || type === 'heading' || type === 'bulletList' || type === 'orderedList' || type === 'listItem') {
    parts.push('\n')
  }

  return parts.join('')
}
