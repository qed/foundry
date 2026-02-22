import { NextRequest } from 'next/server'
import { getProjectAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/agent/shop?projectId=...
 * Load conversation history for the Pattern Shop agent.
 */
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return Response.json({ error: 'projectId required' }, { status: 400 })
    }

    await getProjectAndValidateAccess(projectId)
    const supabase = createServiceClient()

    const { data: conversation } = await supabase
      .from('agent_conversations')
      .select('id, messages, updated_at')
      .eq('project_id', projectId)
      .eq('module', 'pattern_shop')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    return Response.json({
      conversationId: conversation?.id || null,
      messages: conversation?.messages || [],
    })
  } catch (error) {
    return handleAuthError(error)
  }
}

/**
 * PUT /api/agent/shop
 * Save conversation messages.
 */
export async function PUT(request: NextRequest) {
  try {
    const { projectId, messages } = await request.json()
    if (!projectId) {
      return Response.json({ error: 'projectId required' }, { status: 400 })
    }

    await getProjectAndValidateAccess(projectId)
    const supabase = createServiceClient()

    const { data: existing } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('project_id', projectId)
      .eq('module', 'pattern_shop')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      await supabase
        .from('agent_conversations')
        .update({ messages, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('agent_conversations').insert({
        project_id: projectId,
        module: 'pattern_shop',
        messages,
      })
    }

    return Response.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
