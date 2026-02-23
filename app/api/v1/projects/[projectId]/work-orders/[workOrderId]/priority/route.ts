import { NextRequest } from 'next/server'
import { authenticateApiKey, apiError } from '@/lib/mcp/auth'
import { hasScope } from '@/lib/mcp/keys'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'

const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; workOrderId: string }> }
) {
  const connection = await authenticateApiKey(request)
  if (!connection) return apiError('Invalid or revoked API key', 401)

  const { projectId, workOrderId } = await params
  if (connection.project_id !== projectId) {
    return apiError('API key not authorized for this project', 403)
  }

  if (!hasScope('write:priority', connection.scopes)) {
    return apiError('Insufficient scope: write:priority required', 403)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const body = await request.json()
  const { priority } = body

  if (!priority || !VALID_PRIORITIES.includes(priority)) {
    return Response.json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` }, { status: 400, headers })
  }

  const supabase = createServiceClient()

  const { data: wo } = await supabase
    .from('work_orders')
    .select('id, priority')
    .eq('id', workOrderId)
    .eq('project_id', projectId)
    .single()

  if (!wo) {
    return Response.json({ error: 'Work order not found' }, { status: 404, headers })
  }

  const { data: updated, error } = await supabase
    .from('work_orders')
    .update({ priority })
    .eq('id', workOrderId)
    .select()
    .single()

  if (error) {
    return Response.json({ error: 'Failed to update priority' }, { status: 500, headers })
  }

  await supabase.from('work_order_activity').insert({
    work_order_id: workOrderId,
    user_id: connection.id,
    action: 'priority_changed',
    details: {
      from: wo.priority,
      to: priority,
      source: 'mcp_api',
      connection_name: connection.name,
    },
  })

  return Response.json(updated, { headers })
}
