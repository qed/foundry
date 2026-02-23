import { NextRequest } from 'next/server'
import { authenticateApiKey, apiError } from '@/lib/mcp/auth'
import { hasScope } from '@/lib/mcp/keys'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'

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

  if (!hasScope('read:work-orders', connection.scopes)) {
    return apiError('Insufficient scope: read:work-orders required', 403)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const assignee = searchParams.get('assignee')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset = parseInt(searchParams.get('offset') || '0')

  const supabase = createServiceClient()
  let query = supabase
    .from('work_orders')
    .select('id, title, description, status, priority, assignee_id, phase_id, feature_node_id, created_at, updated_at', { count: 'exact' })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status as 'backlog' | 'ready' | 'in_progress' | 'in_review' | 'done')
  if (assignee) {
    if (assignee === 'unassigned') {
      query = query.is('assignee_id', null)
    } else {
      query = query.eq('assignee_id', assignee)
    }
  }

  const { data, error, count } = await query

  if (error) {
    return Response.json({ error: 'Failed to fetch work orders' }, { status: 500, headers })
  }

  return Response.json({
    data: data || [],
    pagination: { total: count || 0, limit, offset },
  }, { headers })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const connection = await authenticateApiKey(request)
  if (!connection) return apiError('Invalid or revoked API key', 401)

  const { projectId } = await params
  if (connection.project_id !== projectId) {
    return apiError('API key not authorized for this project', 403)
  }

  if (!hasScope('write:create-work-orders', connection.scopes)) {
    return apiError('Insufficient scope: write:create-work-orders required', 403)
  }

  const rl = checkRateLimit(connection.id, connection.rate_limit)
  const headers = rateLimitHeaders(rl)
  if (!rl.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
  }

  const body = await request.json()
  const { title, description, acceptance_criteria, priority, assignee_id, phase_id, feature_node_id } = body

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return Response.json({ error: 'Title is required (min 3 chars)' }, { status: 400, headers })
  }

  const supabase = createServiceClient()

  // Auto-calculate position
  const { data: maxPos } = await supabase
    .from('work_orders')
    .select('position')
    .eq('project_id', projectId)
    .eq('status', 'backlog')
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = ((maxPos?.position as number) || 0) + 100

  const { data: wo, error } = await supabase
    .from('work_orders')
    .insert({
      project_id: projectId,
      title: title.trim(),
      description: description || null,
      acceptance_criteria: acceptance_criteria || null,
      priority: priority || 'medium',
      assignee_id: assignee_id || null,
      phase_id: phase_id || null,
      feature_node_id: feature_node_id || null,
      status: 'backlog',
      position,
      created_by: connection.id, // Use connection ID as creator
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating work order via API:', error)
    return Response.json({ error: 'Failed to create work order' }, { status: 500, headers })
  }

  // Log activity
  await supabase.from('work_order_activity').insert({
    work_order_id: wo.id,
    user_id: connection.id, // Connection ID for traceability
    action: 'created',
    details: { source: 'mcp_api', connection_name: connection.name },
  })

  return Response.json(wo, { status: 201, headers })
}
