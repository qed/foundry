import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getProjectAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { buildRoomContext, buildRoomSystemPrompt } from '@/lib/agent/room-context'
import { buildGenerationPrompt } from '@/lib/agent/generation-prompt'

// Detect if the user is asking to generate a blueprint
const GENERATION_PATTERNS = [
  /generate\s*(a\s+)?blueprint/i,
  /create\s*(a\s+)?blueprint\s*(draft)?/i,
  /draft\s*(a\s+)?blueprint/i,
  /write\s*(a\s+)?blueprint/i,
  /generate\s*(a\s+)?(technical\s+)?spec/i,
]

function isGenerationRequest(message: string): boolean {
  return GENERATION_PATTERNS.some((p) => p.test(message))
}

function extractText(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  const doc = content as { type?: string; content?: unknown[]; text?: string; code?: string }
  if (doc.code && typeof doc.code === 'string') return doc.code
  if (doc.type === 'text' && doc.text) return doc.text
  if (Array.isArray(doc.content)) {
    return doc.content.map(extractText).join(' ')
  }
  return ''
}

/**
 * POST /api/agent/room/chat
 * Streaming chat endpoint for the Control Room agent.
 * Enhanced with blueprint generation context injection.
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, message, conversationHistory, currentBlueprintId } = await request.json()

    if (!projectId || !message) {
      return Response.json({ error: 'projectId and message required' }, { status: 400 })
    }

    const { project } = await getProjectAndValidateAccess(projectId)
    const supabase = createServiceClient()

    // Load all blueprints for context
    const { data: blueprints } = await supabase
      .from('blueprints')
      .select('id, title, blueprint_type, status, content, feature_node_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    const context = buildRoomContext(
      project.name,
      blueprints || [],
      currentBlueprintId || null
    )
    const systemPrompt = buildRoomSystemPrompt(context)

    // Check if this is a generation request
    const isGeneration = isGenerationRequest(message)
    let enrichedMessage = message
    let maxTokens = 2000

    if (isGeneration && currentBlueprintId) {
      // Find the current blueprint to get its feature_node_id
      const currentBp = (blueprints || []).find((bp) => bp.id === currentBlueprintId)

      if (currentBp?.blueprint_type === 'feature' && currentBp.feature_node_id) {
        // Load feature node details
        const { data: featureNode } = await supabase
          .from('feature_nodes')
          .select('id, title, description, level, parent_id')
          .eq('id', currentBp.feature_node_id)
          .single()

        if (featureNode) {
          // Load parent title if exists
          let parentTitle: string | null = null
          if (featureNode.parent_id) {
            const { data: parent } = await supabase
              .from('feature_nodes')
              .select('title')
              .eq('id', featureNode.parent_id)
              .single()
            parentTitle = parent?.title || null
          }

          // Load feature requirements documents
          const { data: reqDocs } = await supabase
            .from('requirements_documents')
            .select('title, content, doc_type')
            .eq('project_id', projectId)
            .eq('feature_node_id', featureNode.id)
            .order('doc_type')

          let requirementsContent: string | null = null
          let technicalContent: string | null = null

          if (reqDocs && reqDocs.length > 0) {
            for (const doc of reqDocs) {
              const text = extractText(doc.content)
              if (text) {
                if (doc.doc_type === 'technical_requirement') {
                  technicalContent = (technicalContent ? technicalContent + '\n\n' : '') + text
                } else {
                  requirementsContent = (requirementsContent ? requirementsContent + '\n\n' : '') + text
                }
              }
            }
          }

          // Load foundation blueprints for architecture context
          const foundations = (blueprints || [])
            .filter((bp) => bp.blueprint_type === 'foundation')
            .map((bp) => ({
              title: bp.title,
              contentPreview: extractText(bp.content).slice(0, 500),
            }))

          // Build the enriched generation prompt
          enrichedMessage = buildGenerationPrompt(
            {
              title: featureNode.title,
              description: featureNode.description,
              level: featureNode.level,
              parentTitle,
              requirementsContent: requirementsContent?.slice(0, 3000) || null,
              technicalRequirementsContent: technicalContent?.slice(0, 2000) || null,
            },
            foundations
          )

          // Use more tokens for generation
          maxTokens = 4000
        }
      } else if (!currentBp || currentBp.blueprint_type !== 'feature') {
        // Not viewing a feature blueprint - return helpful message
        enrichedMessage = message + '\n\n[Note: I am not currently viewing a feature blueprint. Please select a feature blueprint first to generate a draft, or I can help with general blueprint guidance.]'
      }
    }

    // Build messages for Anthropic
    const apiMessages: { role: 'user' | 'assistant'; content: string }[] = [
      ...(conversationHistory || [])
        .slice(-20)
        .map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      { role: 'user', content: enrichedMessage },
    ]

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY not configured. Add it to .env.local to enable the Control Room Agent.' },
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
            max_tokens: maxTokens,
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
          console.error('[room-agent] Streaming error:', err)
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
        'X-Generation-Mode': isGeneration ? 'true' : 'false',
      },
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
