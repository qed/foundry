import { NextRequest } from 'next/server'
import { authenticateApiKey, apiError } from '@/lib/mcp/auth'
import { hasScope } from '@/lib/mcp/keys'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'

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

  if (!hasScope('write:assignment', connection.scopes)) {
    return apiError('Insufficient scope: write:assignment required', 403)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const body = await request.json()
  const { assignee_id } = body

  const supabase = createServiceClient()

  const { data: wo } = await supabase
    .from('work_orders')
    .select('id, assignee_id')
    .eq('id', workOrderId)
    .eq('project_id', projectId)
    .single()

  if (!wo) {
    return Response.json({ error: 'Work order not found' }, { status: 404, headers })
  }

  const { data: updated, error } = await supabase
    .from('work_orders')
    .update({ assignee_id: assignee_id || null })
    .eq('id', workOrderId)
    .select()
    .single()

  if (error) {
    return Response.json({ error: 'Failed to update assignment' }, { status: 500, headers })
  }

  await supabase.from('work_order_activity').insert({
    work_order_id: workOrderId,
    user_id: connection.id,
    action: assignee_id ? 'assigned' : 'unassigned',
    details: {
      from: wo.assignee_id,
      to: assignee_id || null,
      source: 'mcp_api',
      connection_name: connection.name,
    },
  })

  return Response.json(updated, { headers })
}
