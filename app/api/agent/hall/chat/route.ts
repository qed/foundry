import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getProjectAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { buildHallContext, buildSystemPrompt } from '@/lib/agent/context'

/**
 * POST /api/agent/hall/chat
 * Streaming chat endpoint using Anthropic Claude.
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, message, conversationHistory } = await request.json()

    if (!projectId || !message) {
      return Response.json({ error: 'projectId and message required' }, { status: 400 })
    }

    const { project } = await getProjectAndValidateAccess(projectId)
    const supabase = createServiceClient()

    // Load ideas for context
    const { data: ideas } = await supabase
      .from('ideas')
      .select('id, title, body, status, created_at')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200)

    // Load tags for ideas
    const ideaIds = (ideas || []).map((i) => i.id)
    let ideaTags: { idea_id: string; tag_name: string }[] = []
    if (ideaIds.length > 0) {
      const { data: tagData } = await supabase
        .from('idea_tags')
        .select('idea_id, tags!inner(name)')
        .in('idea_id', ideaIds)

      ideaTags = (tagData || []).map((row) => ({
        idea_id: row.idea_id,
        tag_name: (row.tags as unknown as { name: string }).name,
      }))
    }

    // Build context and system prompt
    const context = buildHallContext(project.name, ideas || [], ideaTags)
    const systemPrompt = buildSystemPrompt(context)

    // Build messages for Anthropic
    const apiMessages: { role: 'user' | 'assistant'; content: string }[] = [
      ...(conversationHistory || [])
        .slice(-20) // Keep last 20 messages for context window
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
        { error: 'ANTHROPIC_API_KEY not configured. Add it to .env.local to enable the Hall Agent.' },
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
            max_tokens: 1024,
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
          console.error('[agent] Streaming error:', err)
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
