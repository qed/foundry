import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getProjectAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { buildShopContext, buildShopSystemPrompt } from '@/lib/agent/shop-context'

/**
 * POST /api/agent/shop/chat
 * Streaming chat endpoint for the Pattern Shop agent.
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, message, conversationHistory, selectedNodeId } = await request.json()

    if (!projectId || !message) {
      return Response.json({ error: 'projectId and message required' }, { status: 400 })
    }

    const { project } = await getProjectAndValidateAccess(projectId)
    const supabase = createServiceClient()

    // Load feature tree
    const { data: nodes } = await supabase
      .from('feature_nodes')
      .select('id, title, level, status, parent_id')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('position', { ascending: true })

    // Load product overview
    let productOverviewContent: string | null = null
    const { data: poDoc } = await supabase
      .from('requirements_documents')
      .select('content')
      .eq('project_id', projectId)
      .eq('doc_type', 'product_overview')
      .limit(1)
      .single()

    if (poDoc?.content) {
      productOverviewContent = poDoc.content
    }

    // Load current FRD if a node is selected
    let currentFrd: { title: string; content: string } | null = null
    if (selectedNodeId) {
      const { data: frdDoc } = await supabase
        .from('requirements_documents')
        .select('title, content')
        .eq('feature_node_id', selectedNodeId)
        .eq('doc_type', 'feature_requirement')
        .limit(1)
        .single()

      if (frdDoc?.content) {
        currentFrd = { title: frdDoc.title, content: frdDoc.content }
      }
    }

    // Build context and system prompt
    const context = buildShopContext(
      project.name,
      nodes || [],
      productOverviewContent,
      currentFrd
    )
    const systemPrompt = buildShopSystemPrompt(context)

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
        { error: 'ANTHROPIC_API_KEY not configured. Add it to .env.local to enable the Pattern Shop Agent.' },
        { status: 503 }
      )
    }

    const client = new Anthropic({ apiKey })

    // Stream response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use higher token limit for structured output requests (tree gen, FRD review)
          const isTreeGen = /generat|create.*tree|decompos|break.*down.*feature/i.test(message)
          const isReview = /review|check.*testab|analyz.*req|audit.*frd/i.test(message)
          const needsMoreTokens = isTreeGen || isReview

          const response = client.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: needsMoreTokens ? 4000 : 1500,
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
          console.error('[shop-agent] Streaming error:', err)
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
