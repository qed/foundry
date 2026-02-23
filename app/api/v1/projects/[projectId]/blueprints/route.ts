import { NextRequest } from 'next/server'
import { authenticateApiKey, apiError } from '@/lib/mcp/auth'
import { hasScope } from '@/lib/mcp/keys'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/v1/projects/[projectId]/blueprints
 * List blueprints for a project (MCP API key auth).
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

  if (!hasScope('read:blueprints', connection.scopes)) {
    return apiError('Insufficient scope: read:blueprints required', 403)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const { searchParams } = new URL(request.url)
  const bpType = searchParams.get('type')
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset = parseInt(searchParams.get('offset') || '0')

  const supabase = createServiceClient()
  let query = supabase
    .from('blueprints')
    .select('id, title, blueprint_type, status, feature_node_id, created_at, updated_at', { count: 'exact' })
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (bpType) query = query.eq('blueprint_type', bpType as 'feature' | 'foundation' | 'system_diagram')
  if (status) query = query.eq('status', status as 'draft' | 'in_review' | 'approved' | 'implemented')

  const { data, error, count } = await query

  if (error) {
    return Response.json({ error: 'Failed to fetch blueprints' }, { status: 500, headers })
  }

  return Response.json({
    data: data || [],
    pagination: { total: count || 0, limit, offset },
  }, { headers })
}
