import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/projects/[projectId]/work-orders/[woId]/generate-plan
 * Generate an implementation plan using AI based on work order context.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; woId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, woId } = await params

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

    // Fetch work order
    const { data: workOrder, error: woErr } = await supabase
      .from('work_orders')
      .select('id, title, description, acceptance_criteria, priority, status, feature_node_id, phase_id')
      .eq('id', woId)
      .eq('project_id', projectId)
      .single()

    if (woErr || !workOrder) {
      return Response.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Fetch feature name if linked
    let featureName: string | null = null
    if (workOrder.feature_node_id) {
      const { data: feature } = await supabase
        .from('feature_nodes')
        .select('title')
        .eq('id', workOrder.feature_node_id)
        .single()
      featureName = feature?.title || null
    }

    // Fetch phase name if set
    let phaseName: string | null = null
    if (workOrder.phase_id) {
      const { data: phase } = await supabase
        .from('phases')
        .select('name')
        .eq('id', workOrder.phase_id)
        .single()
      phaseName = phase?.name || null
    }

    // Build context for the AI
    const context = [
      `Title: ${workOrder.title}`,
      `Priority: ${workOrder.priority}`,
      `Status: ${workOrder.status}`,
      workOrder.description ? `Description: ${workOrder.description}` : null,
      workOrder.acceptance_criteria ? `Acceptance Criteria:\n${workOrder.acceptance_criteria}` : null,
      featureName ? `Linked Feature: ${featureName}` : null,
      phaseName ? `Phase: ${phaseName}` : null,
    ].filter(Boolean).join('\n\n')

    // Call Claude to generate plan
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: PLAN_GENERATION_PROMPT,
      messages: [
        { role: 'user', content: context },
      ],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return Response.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Log activity
    await supabase.from('work_order_activity').insert({
      work_order_id: woId,
      user_id: user.id,
      action: 'implementation_plan_generated',
      details: { source: 'agent' },
    })

    return Response.json({
      generated_plan: textContent.text,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

const PLAN_GENERATION_PROMPT = `You are an implementation planning assistant for a product development tool (Helix Foundry). Generate a detailed, actionable implementation plan for the given work order.

The project uses: Next.js (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth), React 19.

Structure your plan with these markdown sections:

## Objective
1-2 sentence summary of what needs to be implemented.

## Dependencies
List any prerequisites or things that must be done first. If none are obvious, say "None identified."

## File Changes
List each file to create or modify with a brief description of what changes:
- \`path/to/file.tsx\` — Description of changes
- \`path/to/new-file.ts\` — (new) Description

## Implementation Steps
Numbered, detailed steps. Include brief code examples where helpful using fenced code blocks. Each step should be actionable.

## Key Considerations
- Edge cases to handle
- Performance considerations
- Security concerns
- Testing approach

Keep the plan focused and practical. Use markdown formatting (headers, lists, code blocks, bold). Do not include preamble or explanations outside the structured sections.`
