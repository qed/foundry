import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getProjectAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { buildLabContext, buildLabSystemPrompt } from '@/lib/agent/lab-context'

/**
 * POST /api/agent/lab/chat
 * Streaming chat endpoint for the Insights Lab agent using Anthropic Claude.
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, message, conversationHistory } = await request.json()

    if (!projectId || !message) {
      return Response.json({ error: 'projectId and message required' }, { status: 400 })
    }

    const { project } = await getProjectAndValidateAccess(projectId)
    const supabase = createServiceClient()

    // Load feedback for context
    const { data: feedback } = await supabase
      .from('feedback_submissions')
      .select('id, content, category, status, score, tags, submitter_name, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(200)

    // Build context and system prompt
    const context = buildLabContext(project.name, feedback || [])
    const systemPrompt = buildLabSystemPrompt(context)

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

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY not configured. Add it to .env.local to enable the Lab Agent.' },
        { status: 503 }
      )
    }

    const client = new Anthropic({ apiKey })

    // Stream response
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
          console.error('[lab-agent] Streaming error:', err)
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
