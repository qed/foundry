import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { extractTextFromContent } from '@/lib/blueprints/version-utils'

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

/**
 * POST /api/agent/room/cross-doc-analyze
 * Analyzes a blueprint against related blueprints and creates cross-document suggestions.
 * Non-streaming — returns the created suggestion directly.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { projectId, blueprintId } = await request.json()

    if (!projectId || !blueprintId) {
      return Response.json({ error: 'projectId and blueprintId are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch the trigger blueprint
    const { data: triggerBlueprint } = await supabase
      .from('blueprints')
      .select('id, title, blueprint_type, content, feature_node_id, status')
      .eq('id', blueprintId)
      .eq('project_id', projectId)
      .single()

    if (!triggerBlueprint) {
      return Response.json({ error: 'Blueprint not found' }, { status: 404 })
    }

    // Fetch all other blueprints in the project
    const { data: allBlueprints } = await supabase
      .from('blueprints')
      .select('id, title, blueprint_type, content, feature_node_id, status')
      .eq('project_id', projectId)
      .neq('id', blueprintId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!allBlueprints || allBlueprints.length === 0) {
      return Response.json({ error: 'No other blueprints to analyze against' }, { status: 400 })
    }

    // Build analysis prompt
    const triggerText = truncate(extractTextFromContent(triggerBlueprint.content), 6000)

    const relatedSummaries = allBlueprints.map((bp) => {
      const text = truncate(extractTextFromContent(bp.content), 2000)
      return `### ${bp.title} (${bp.blueprint_type}, status: ${bp.status})
ID: ${bp.id}
${text}`
    }).join('\n\n---\n\n')

    const systemPrompt = `You are a technical architect reviewing blueprints for consistency across a project.

Your task: Analyze the trigger blueprint and identify specific, actionable edits needed in OTHER blueprints to maintain consistency.

Focus on:
1. Inconsistencies (same concept described differently)
2. Missing sections (trigger blueprint has important details not reflected in related blueprints)
3. Conflicting specifications (different versions of APIs, data models, or flows)
4. Dependency gaps (one blueprint references something not documented in its dependency)

IMPORTANT: Only suggest changes to OTHER blueprints, not the trigger blueprint itself.
IMPORTANT: Be specific — include the exact section to change and what the proposed content should be.
IMPORTANT: Only suggest high-value changes. Skip trivial formatting differences.

Respond ONLY with a valid JSON object (no markdown code fences, no explanation before or after):
{
  "title": "Brief title of the overall change set",
  "description": "Explanation of what changed and why related blueprints need updates",
  "changeImpact": "High/Medium/Low — with brief explanation of impact scope",
  "items": [
    {
      "blueprintId": "UUID of the target blueprint",
      "blueprintTitle": "Title for reference",
      "suggestionType": "edit|add_section|remove_section",
      "targetSection": "Name of the section to modify",
      "currentContent": "Brief excerpt of current content (if edit/remove)",
      "proposedContent": "The full proposed replacement content in markdown",
      "reasoning": "Why this change is needed for consistency"
    }
  ]
}

If no meaningful changes are needed, return:
{"title":"No changes needed","description":"All blueprints are consistent.","changeImpact":"None","items":[]}`

    const userMessage = `## Trigger Blueprint: ${triggerBlueprint.title}
Type: ${triggerBlueprint.blueprint_type} | Status: ${triggerBlueprint.status}

${triggerText}

---

## Related Blueprints in Project

${relatedSummaries}`

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 503 }
      )
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    // Extract text from response
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    // Parse JSON response
    let parsed: {
      title: string
      description: string
      changeImpact: string
      items: {
        blueprintId: string
        blueprintTitle?: string
        suggestionType: string
        targetSection?: string
        currentContent?: string
        proposedContent?: string
        reasoning?: string
      }[]
    }

    try {
      // Try to extract JSON from possible markdown code fences
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      console.error('[cross-doc] Failed to parse agent response:', responseText.slice(0, 500))
      return Response.json({ error: 'Agent response was not valid JSON' }, { status: 502 })
    }

    // If no items, return early
    if (!parsed.items || parsed.items.length === 0) {
      return Response.json({ suggestion: null, message: parsed.description || 'No changes needed' })
    }

    // Validate blueprint IDs exist in the project
    const validBpIds = new Set(allBlueprints.map((bp) => bp.id))
    const validItems = parsed.items.filter((item) => validBpIds.has(item.blueprintId))

    if (validItems.length === 0) {
      return Response.json({ suggestion: null, message: 'Agent suggested changes for unknown blueprints' })
    }

    // Create suggestion in database
    const { data: suggestion, error: sugError } = await supabase
      .from('cross_doc_suggestions')
      .insert({
        project_id: projectId,
        created_by: user.id,
        trigger_blueprint_id: blueprintId,
        title: parsed.title,
        description: parsed.description,
        change_impact: parsed.changeImpact || null,
      })
      .select()
      .single()

    if (sugError || !suggestion) {
      console.error('Error creating cross-doc suggestion:', sugError)
      return Response.json({ error: 'Failed to save suggestion' }, { status: 500 })
    }

    // Create items
    const validSuggestionTypes = ['edit', 'add_section', 'remove_section'] as const
    type SuggestionType = typeof validSuggestionTypes[number]
    const itemInserts = validItems.map((item) => ({
      suggestion_id: suggestion.id,
      blueprint_id: item.blueprintId,
      suggestion_type: (validSuggestionTypes.includes(item.suggestionType as SuggestionType)
        ? item.suggestionType
        : 'edit') as SuggestionType,
      target_section: item.targetSection || null,
      current_content: item.currentContent || null,
      proposed_content: item.proposedContent || null,
      reasoning: item.reasoning || null,
    }))

    const { error: itemsError } = await supabase
      .from('cross_doc_suggestion_items')
      .insert(itemInserts)

    if (itemsError) {
      console.error('Error creating suggestion items:', itemsError)
      await supabase.from('cross_doc_suggestions').delete().eq('id', suggestion.id)
      return Response.json({ error: 'Failed to save suggestion items' }, { status: 500 })
    }

    return Response.json({
      suggestion: {
        ...suggestion,
        item_count: validItems.length,
      },
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
