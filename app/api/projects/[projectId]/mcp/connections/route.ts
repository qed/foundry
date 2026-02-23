import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { generateApiKey, validateScopes } from '@/lib/mcp/keys'

const VALID_AGENT_TYPES = ['code_assistant', 'ci_cd', 'github_action', 'custom']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: connections, error } = await supabase
      .from('mcp_connections')
      .select('id, name, description, api_key_preview, agent_type, status, rate_limit, scopes, last_used_at, created_at, created_by')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    return Response.json({ connections: connections || [] })
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { name, description, agent_type, scopes, rate_limit } = body
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Validate inputs
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return Response.json({ error: 'Name is required (min 2 chars)' }, { status: 400 })
    }

    if (!agent_type || !VALID_AGENT_TYPES.includes(agent_type)) {
      return Response.json({ error: `agent_type must be one of: ${VALID_AGENT_TYPES.join(', ')}` }, { status: 400 })
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return Response.json({ error: 'At least one scope is required' }, { status: 400 })
    }

    if (!validateScopes(scopes)) {
      return Response.json({ error: 'Invalid scope(s) provided' }, { status: 400 })
    }

    const limitValue = rate_limit && typeof rate_limit === 'number' && rate_limit > 0 ? rate_limit : 100

    // Generate API key
    const { raw, hash, preview } = generateApiKey()

    const { data: connection, error } = await supabase
      .from('mcp_connections')
      .insert({
        project_id: projectId,
        name: name.trim(),
        description: description || null,
        api_key_hash: hash,
        api_key_preview: preview,
        agent_type,
        scopes,
        rate_limit: limitValue,
        created_by: user.id,
      })
      .select('id, name, description, api_key_preview, agent_type, status, rate_limit, scopes, created_at')
      .single()

    if (error) {
      console.error('Error creating MCP connection:', error)
      return Response.json({ error: 'Failed to create connection' }, { status: 500 })
    }

    // Return the raw API key ONCE — it cannot be retrieved again
    return Response.json({
      ...connection,
      api_key: raw,
    }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
