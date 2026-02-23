import { NextRequest } from 'next/server'
import { authenticateApiKey, apiError } from '@/lib/mcp/auth'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'

export async function POST(request: NextRequest) {
  const connection = await authenticateApiKey(request)
  if (!connection) {
    return apiError('Invalid or revoked API key', 401)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)

  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  return Response.json({
    valid: true,
    project_id: connection.project_id,
    scopes: connection.scopes,
    rate_limit: connection.rate_limit,
    remaining: rl.remaining,
    connection_name: connection.name,
  }, { headers })
}
