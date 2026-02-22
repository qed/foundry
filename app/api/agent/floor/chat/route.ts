import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getProjectAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { buildFloorContext, buildFloorSystemPrompt } from '@/lib/agent/floor-context'

/**
 * POST /api/agent/floor/chat
 * Streaming chat endpoint for the Assembly Floor agent.
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, message, conversationHistory } = await request.json()

    if (!projectId || !message) {
      return Response.json({ error: 'projectId and message required' }, { status: 400 })
    }

    const { project } = await getProjectAndValidateAccess(projectId)
    const supabase = createServiceClient()

    // Load work orders, phases, features in parallel
    const [woResult, phaseResult, featureResult] = await Promise.all([
      supabase
        .from('work_orders')
        .select('id, title, status, priority, phase_id, assignee_id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
      supabase
        .from('phases')
        .select('id, name, status')
        .eq('project_id', projectId)
        .order('position', { ascending: true }),
      supabase
        .from('feature_nodes')
        .select('id, title, level, status')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('position', { ascending: true }),
    ])

    const context = buildFloorContext(
      project.name,
      woResult.data || [],
      phaseResult.data || [],
      featureResult.data || []
    )
    const systemPrompt = buildFloorSystemPrompt(context)

    // Build messages for Anthropic
    const apiMessages: { role: 'user' | 'assistant'; content: string }[] = [
      ...(conversationHistory || [])
        .slice(-20)
        .map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      { role: 'user', content: message },
    ]

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY not configured. Add it to .env.local to enable the Assembly Floor Agent.' },
        { status: 503 }
      )
    }

    const client = new Anthropic({ apiKey })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = client.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1500,
            system: systemPrompt,
            messages: apiMessages,
          })

          for await (const event of response) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }

          controller.close()
        } catch (err) {
          console.error('[floor-agent] Streaming error:', err)
          controller.enqueue(
            encoder.encode('\n\n*Sorry, I encountered an error. Please try again.*')
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
