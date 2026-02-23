import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { Json } from '@/types/database'

/**
 * POST /api/projects/[projectId]/work-orders/extract
 * Extract work orders from blueprint content using AI.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { blueprint_ids } = body as { blueprint_ids: string[] }

    if (!blueprint_ids || !Array.isArray(blueprint_ids) || blueprint_ids.length === 0) {
      return Response.json({ error: 'blueprint_ids is required' }, { status: 400 })
    }

    if (blueprint_ids.length > 5) {
      return Response.json({ error: 'Maximum 5 blueprints per extraction' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 503 }
      )
    }

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

    // Fetch blueprints
    const { data: blueprints, error: bpError } = await supabase
      .from('blueprints')
      .select('id, title, content, blueprint_type, feature_node_id')
      .eq('project_id', projectId)
      .in('id', blueprint_ids)

    if (bpError || !blueprints || blueprints.length === 0) {
      return Response.json({ error: 'Blueprints not found' }, { status: 404 })
    }

    // Fetch existing work order titles for duplicate detection
    const { data: existingWOs } = await supabase
      .from('work_orders')
      .select('title')
      .eq('project_id', projectId)

    const existingTitles = (existingWOs || []).map((wo) => wo.title.toLowerCase())

    // Convert blueprint JSON content to plain text
    const blueprintTexts = blueprints.map((bp) => {
      const text = extractPlainText(bp.content)
      return `## Blueprint: ${bp.title}\nType: ${bp.blueprint_type}\n\n${text}`
    }).join('\n\n---\n\n')

    // Call Claude to extract work orders
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: EXTRACTION_PROMPT,
      messages: [
        { role: 'user', content: blueprintTexts },
      ],
    })

    // Parse response
    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return Response.json({ error: 'No response from AI' }, { status: 500 })
    }

    let extracted: ExtractedWorkOrder[] = []
    try {
      // Extract JSON from response (may be wrapped in ```json blocks)
      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0])
      }
    } catch {
      return Response.json({
        error: 'Failed to parse extraction results',
        raw: textContent.text,
      }, { status: 500 })
    }

    // Enrich with source blueprint info and check for duplicates
    const results = extracted.map((wo) => {
      const sourceBp = blueprints.length === 1
        ? blueprints[0]
        : blueprints.find((bp) => wo.source_blueprint_title && bp.title.toLowerCase().includes(wo.source_blueprint_title.toLowerCase())) || blueprints[0]

      const isDuplicate = existingTitles.some(
        (t) => t === wo.title.toLowerCase() || levenshteinSimilarity(t, wo.title.toLowerCase()) > 0.8
      )

      return {
        ...wo,
        source_blueprint_id: sourceBp.id,
        source_blueprint_title: sourceBp.title,
        feature_node_id: sourceBp.feature_node_id,
        is_duplicate: isDuplicate,
      }
    })

    return Response.json({
      extracted_work_orders: results,
      source_blueprints: blueprints.map((bp) => ({ id: bp.id, title: bp.title })),
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

/* ── Types ─────────────────────────────────────────────────────── */

interface ExtractedWorkOrder {
  title: string
  description: string
  acceptance_criteria: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  complexity: string
  source_blueprint_title?: string
  source_blueprint_id?: string
  feature_node_id?: string | null
  is_duplicate?: boolean
}

/* ── Helpers ───────────────────────────────────────────────────── */

const EXTRACTION_PROMPT = `You are a work order extraction assistant for a product development tool. Your job is to analyze blueprint documents and extract discrete, actionable work orders.

For each work order, provide:
- title: Short, actionable title (5-15 words)
- description: 1-2 paragraph description of what needs to be done
- acceptance_criteria: Numbered list of testable requirements, each on a new line prefixed with a number and period (e.g. "1. User can log in")
- priority: One of "critical", "high", "medium", "low" — based on importance and whether it blocks other work
- complexity: One of "simple", "medium", "complex"
- source_blueprint_title: The title of the blueprint this was extracted from

Return ONLY a JSON array of objects. No markdown fences, no explanation. Example:
[
  {
    "title": "Implement user authentication",
    "description": "Add OAuth2 authentication...",
    "acceptance_criteria": "1. User can log in\\n2. Session persists\\n3. Logout works",
    "priority": "high",
    "complexity": "medium",
    "source_blueprint_title": "Authentication Blueprint"
  }
]

Extract ALL actionable items. Be thorough but avoid duplicates. Each work order should be a single discrete task, not an epic.`

/**
 * Recursively extract plain text from TipTap/ProseMirror JSON content.
 */
function extractPlainText(content: Json): string {
  if (!content || typeof content !== 'object') return String(content || '')
  if (Array.isArray(content)) return content.map(extractPlainText).join('')

  const node = content as Record<string, Json>
  const parts: string[] = []

  if (node.text && typeof node.text === 'string') {
    parts.push(node.text)
  }

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      parts.push(extractPlainText(child))
    }
  }

  // Add line breaks after block-level elements
  const type = node.type as string | undefined
  if (type === 'paragraph' || type === 'heading' || type === 'bulletList' || type === 'orderedList' || type === 'listItem') {
    parts.push('\n')
  }

  return parts.join('')
}

/**
 * Simple Levenshtein-based similarity (0-1 range).
 */
function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (longer.length === 0) return 1

  const matrix: number[][] = []
  for (let i = 0; i <= shorter.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= longer.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= shorter.length; i++) {
    for (let j = 1; j <= longer.length; j++) {
      const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  return 1 - matrix[shorter.length][longer.length] / longer.length
}
