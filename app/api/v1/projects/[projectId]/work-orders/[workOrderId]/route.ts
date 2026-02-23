import { NextRequest } from 'next/server'
import { authenticateApiKey, apiError } from '@/lib/mcp/auth'
import { hasScope } from '@/lib/mcp/keys'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; workOrderId: string }> }
) {
  const connection = await authenticateApiKey(request)
  if (!connection) return apiError('Invalid or revoked API key', 401)

  const { projectId, workOrderId } = await params
  if (connection.project_id !== projectId) {
    return apiError('API key not authorized for this project', 403)
  }

  if (!hasScope('read:work-orders', connection.scopes)) {
    return apiError('Insufficient scope: read:work-orders required', 403)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const supabase = createServiceClient()

  const { data: wo, error } = await supabase
    .from('work_orders')
    .select('*')
    .eq('id', workOrderId)
    .eq('project_id', projectId)
    .single()

  if (error || !wo) {
    return Response.json({ error: 'Work order not found' }, { status: 404, headers })
  }

  // Fetch recent activity
  const { data: activity } = await supabase
    .from('work_order_activity')
    .select('id, action, details, created_at, user_id')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false })
    .limit(20)

  return Response.json({ ...wo, activity: activity || [] }, { headers })
}
