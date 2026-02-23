import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/projects/[projectId]/work-orders/suggest-phases
 * Analyze work orders and suggest phase groupings using AI.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { constraints } = body as {
      constraints?: { min_phases?: number; max_phases?: number; focus_feature_id?: string; instructions?: string }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
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

    // Fetch work orders, existing phases, and features in parallel
    const [woRes, phaseRes, featureRes] = await Promise.all([
      supabase
        .from('work_orders')
        .select('id, title, description, acceptance_criteria, status, priority, phase_id, feature_node_id, assignee_id, position')
        .eq('project_id', projectId)
        .order('position', { ascending: true }),
      supabase
        .from('phases')
        .select('id, name, status, position')
        .eq('project_id', projectId)
        .order('position', { ascending: true }),
      supabase
        .from('feature_nodes')
        .select('id, title, level, parent_id')
        .eq('project_id', projectId),
    ])

    const workOrders = woRes.data || []
    const existingPhases = phaseRes.data || []
    const features = featureRes.data || []

    if (workOrders.length === 0) {
      return Response.json({
        error: 'No work orders to plan. Create work orders first or extract them from blueprints.',
      }, { status: 400 })
    }

    // Build feature name map
    const featureMap = new Map(features.map((f) => [f.id, f.title]))

    // Build work order context for the AI
    const woContext = workOrders.map((wo) => ({
      id: wo.id,
      title: wo.title,
      description: wo.description ? wo.description.slice(0, 200) : null,
      priority: wo.priority,
      status: wo.status,
      feature: wo.feature_node_id ? featureMap.get(wo.feature_node_id) || null : null,
      feature_id: wo.feature_node_id,
      current_phase_id: wo.phase_id,
      has_acceptance_criteria: !!wo.acceptance_criteria,
    }))

    // Build constraint instructions
    const constraintLines: string[] = []
    if (constraints?.min_phases) constraintLines.push(`Minimum phases: ${constraints.min_phases}`)
    if (constraints?.max_phases) constraintLines.push(`Maximum phases: ${constraints.max_phases}`)
    if (constraints?.focus_feature_id) {
      const focusName = featureMap.get(constraints.focus_feature_id)
      if (focusName) constraintLines.push(`Focus grouping around feature: "${focusName}"`)
    }
    if (constraints?.instructions) constraintLines.push(`User instructions: ${constraints.instructions}`)

    const constraintText = constraintLines.length > 0
      ? `\n\nConstraints:\n${constraintLines.join('\n')}`
      : ''

    const existingPhaseText = existingPhases.length > 0
      ? `\n\nExisting phases (these already exist — the plan should work with or extend them):\n${existingPhases.map((p) => `- "${p.name}" [${p.status}]`).join('\n')}`
      : ''

    // Call Claude to suggest phases
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: PLANNING_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here are ${workOrders.length} work orders to organize into phases:\n\n${JSON.stringify(woContext, null, 2)}${existingPhaseText}${constraintText}`,
        },
      ],
    })

    // Parse response
    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return Response.json({ error: 'No response from AI' }, { status: 500 })
    }

    let suggestion: PhasePlanSuggestion
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0])
      } else {
        return Response.json({ error: 'Failed to parse suggestion', raw: textContent.text }, { status: 500 })
      }
    } catch {
      return Response.json({ error: 'Failed to parse suggestion', raw: textContent.text }, { status: 500 })
    }

    // Validate and enrich — resolve work order titles to IDs
    const titleToId = new Map(workOrders.map((wo) => [wo.title.toLowerCase(), wo.id]))

    const resolvePhase = (phase: SuggestedPhase) => ({
      ...phase,
      work_order_ids: (phase.work_order_titles || [])
        .map((t) => titleToId.get(t.toLowerCase()))
        .filter((id): id is string => !!id),
    })

    const primary = {
      ...suggestion.primary,
      phases: (suggestion.primary?.phases || []).map(resolvePhase),
    }

    const alternatives = (suggestion.alternatives || []).map((alt) => ({
      ...alt,
      phases: (alt.phases || []).map(resolvePhase),
    }))

    return Response.json({
      primary,
      alternatives,
      work_order_count: workOrders.length,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

/* ── Types ─────────────────────────────────────────────────────── */

interface SuggestedPhase {
  name: string
  work_order_titles: string[]
  work_order_ids?: string[]
  reasoning: string
  estimated_duration: string
  dependencies: string[]
  risks: string[]
}

interface PhasePlan {
  phases: SuggestedPhase[]
  overall_reasoning: string
  critical_path: string
}

interface PhasePlanSuggestion {
  primary: PhasePlan
  alternatives: PhasePlan[]
}

/* ── Prompt ────────────────────────────────────────────────────── */

const PLANNING_SYSTEM_PROMPT = `You are a phase planning assistant for a product development tool. Analyze work orders and suggest how to group them into execution phases.

For each phase plan, consider:
1. **Feature grouping**: Work orders linked to the same feature should generally be in the same phase
2. **Dependencies**: Infer likely dependencies from titles and descriptions. Order phases so prerequisites come first
3. **Priority**: Critical items in earlier phases, lower priority deferred to later phases
4. **Complexity balance**: Mix simple and complex tasks across phases. Don't overload any single phase
5. **Related work**: Group work orders that mention the same components, modules, or domains

Return ONLY valid JSON (no markdown fences). Format:
{
  "primary": {
    "phases": [
      {
        "name": "Phase name",
        "work_order_titles": ["Exact WO title 1", "Exact WO title 2"],
        "reasoning": "Why these items belong together",
        "estimated_duration": "1-2 weeks",
        "dependencies": ["Other phase name this depends on"],
        "risks": ["Key risk"]
      }
    ],
    "overall_reasoning": "Why this structure makes sense",
    "critical_path": "Description of the critical path"
  },
  "alternatives": [
    {
      "phases": [...same structure...],
      "overall_reasoning": "Different grouping strategy explanation",
      "critical_path": "..."
    }
  ]
}

IMPORTANT:
- Use EXACT work order titles in work_order_titles — these are matched to IDs
- Every work order should appear in exactly one phase per plan
- Suggest 3-6 phases for the primary plan (unless constrained)
- Provide 1-2 alternative grouping strategies
- Keep phase names short and descriptive (2-4 words)
- Phases should be ordered by execution sequence (first phase = do first)`
