import { NextRequest } from 'next/server'
import { authenticateApiKey, apiError } from '@/lib/mcp/auth'
import { hasScope } from '@/lib/mcp/keys'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/v1/projects/[projectId]/features
 * List feature tree nodes for a project (MCP API key auth).
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

  if (!hasScope('read:features', connection.scopes)) {
    return apiError('Insufficient scope: read:features required', 403)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const supabase = createServiceClient()

  const { data: nodes, error } = await supabase
    .from('feature_nodes')
    .select('id, title, description, level, status, parent_id, position, created_at, updated_at')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) {
    return Response.json({ error: 'Failed to fetch features' }, { status: 500, headers })
  }

  return Response.json({ data: nodes || [] }, { headers })
}
