import { createServiceClient } from '@/lib/supabase/server'
import { hashApiKey } from './keys'

export interface McpConnection {
  id: string
  project_id: string
  name: string
  scopes: string[]
  rate_limit: number
  status: string
}

/**
 * Authenticate a request using an MCP API key from the Authorization header.
 * Returns the connection details or null if invalid.
 */
export async function authenticateApiKey(request: Request): Promise<McpConnection | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const apiKey = authHeader.substring(7)
  if (!apiKey || !apiKey.startsWith('fnd_')) return null

  const keyHash = hashApiKey(apiKey)
  const supabase = createServiceClient()

  const { data: connection } = await supabase
    .from('mcp_connections')
    .select('id, project_id, name, scopes, rate_limit, status')
    .eq('api_key_hash', keyHash)
    .eq('status', 'active')
    .single()

  if (!connection) return null

  // Update last_used_at (fire-and-forget)
  supabase
    .from('mcp_connections')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', connection.id)
    .then(() => {})

  return connection as McpConnection
}

/**
 * Create a JSON error response for API key auth failures.
 */
export function apiError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}
