import { NextRequest } from 'next/server'
import { authenticateApiKey, apiError } from '@/lib/mcp/auth'
import { hasScope } from '@/lib/mcp/keys'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/v1/projects/[projectId]/requirements
 * List or search requirements documents for a project (MCP API key auth).
 * Query params: ?query=search_text&feature_node_id=uuid&limit=50&offset=0
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const connection = await authenticateApiKey(request)
  if (!connection) return apiError('Invalid or revoked API key', 401)

  const { projectId } = await params
  if (connection.project_id !== projectId) {
    return apiError('API key not authorized for this project', 403)
  }

  if (!hasScope('read:requirements', connection.scopes)) {
    return apiError('Insufficient scope: read:requirements required', 403)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const featureNodeId = searchParams.get('feature_node_id')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset = parseInt(searchParams.get('offset') || '0')

  const supabase = createServiceClient()

  let dbQuery = supabase
    .from('requirements_documents')
    .select('id, title, content, doc_type, feature_node_id, created_at, updated_at', { count: 'exact' })
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (featureNodeId) {
    dbQuery = dbQuery.eq('feature_node_id', featureNodeId)
  }

  if (query) {
    // Full-text search across title and content
    dbQuery = dbQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`)
  }

  const { data, error, count } = await dbQuery

  if (error) {
    return Response.json({ error: 'Failed to fetch requirements' }, { status: 500, headers })
  }

  return Response.json({
    data: data || [],
    pagination: { total: count || 0, limit, offset },
  }, { headers })
}
