import { NextRequest } from 'next/server'
import { authenticateApiKey, apiError } from '@/lib/mcp/auth'
import { hasScope } from '@/lib/mcp/keys'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/v1/projects/[projectId]/phases
 * List phases for a project (MCP API key auth).
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

  if (!hasScope('read:phases', connection.scopes)) {
    return apiError('Insufficient scope: read:phases required', 403)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const supabase = createServiceClient()

  const { data: phases, error } = await supabase
    .from('phases')
    .select('id, name, description, status, position, created_at, updated_at')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) {
    return Response.json({ error: 'Failed to fetch phases' }, { status: 500, headers })
  }

  return Response.json({ data: phases || [] }, { headers })
}
