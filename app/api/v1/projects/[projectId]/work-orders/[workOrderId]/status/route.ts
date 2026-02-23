import { NextRequest } from 'next/server'
import { authenticateApiKey, apiError } from '@/lib/mcp/auth'
import { hasScope } from '@/lib/mcp/keys'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['backlog', 'ready', 'in_progress', 'in_review', 'done']

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

  if (!hasScope('write:status', connection.scopes)) {
    return apiError('Insufficient scope: write:status required', 403)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const body = await request.json()
  const { status, comment } = body

  if (!status || !VALID_STATUSES.includes(status)) {
    return Response.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400, headers })
  }

  const supabase = createServiceClient()

  // Get current work order
  const { data: wo } = await supabase
    .from('work_orders')
    .select('id, status')
    .eq('id', workOrderId)
    .eq('project_id', projectId)
    .single()

  if (!wo) {
    return Response.json({ error: 'Work order not found' }, { status: 404, headers })
  }

  // Update status
  const { data: updated, error } = await supabase
    .from('work_orders')
    .update({ status })
    .eq('id', workOrderId)
    .select()
    .single()

  if (error) {
    return Response.json({ error: 'Failed to update status' }, { status: 500, headers })
  }

  // Log activity
  await supabase.from('work_order_activity').insert({
    work_order_id: workOrderId,
    user_id: connection.id,
    action: 'status_changed',
    details: {
      from: wo.status,
      to: status,
      source: 'mcp_api',
      connection_name: connection.name,
      ...(comment ? { comment } : {}),
    },
  })

  return Response.json(updated, { headers })
}
