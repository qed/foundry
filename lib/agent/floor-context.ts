import type { Json } from '@/types/database'

interface WorkOrderForContext {
  id: string
  title: string
  status: string
  priority: string
  phase_id: string | null
  assignee_id: string | null
}

interface PhaseForContext {
  id: string
  name: string
  status: string
}

interface FeatureForContext {
  id: string
  title: string
  level: string
  status: string
}

export interface FloorContext {
  projectName: string
  workOrderSummary: string
  phaseSummary: string
  featureSummary: string
}

/**
 * Build context payload for the Assembly Floor agent.
 */
export function buildFloorContext(
  projectName: string,
  workOrders: WorkOrderForContext[],
  phases: PhaseForContext[],
  features: FeatureForContext[]
): FloorContext {
  // Build phase name map
  const phaseMap = new Map(phases.map((p) => [p.id, p.name]))

  // Work order summary
  const statusCounts: Record<string, number> = {}
  const priorityCounts: Record<string, number> = {}
  for (const wo of workOrders) {
    statusCounts[wo.status] = (statusCounts[wo.status] || 0) + 1
    priorityCounts[wo.priority] = (priorityCounts[wo.priority] || 0) + 1
  }

  const woLines = workOrders.slice(0, 50).map((wo) => {
    const phase = wo.phase_id ? phaseMap.get(wo.phase_id) || 'Unknown' : 'Unphased'
    return `- [${wo.status}] [${wo.priority}] "${wo.title}" (Phase: ${phase})`
  })

  const workOrderSummary = `Total: ${workOrders.length}
By status: ${Object.entries(statusCounts).map(([s, c]) => `${s}=${c}`).join(', ')}
By priority: ${Object.entries(priorityCounts).map(([p, c]) => `${p}=${c}`).join(', ')}

Work Orders:
${woLines.join('\n')}${workOrders.length > 50 ? `\n...(${workOrders.length - 50} more)` : ''}`

  // Phase summary
  const phaseSummary = phases.length === 0
    ? '(no phases created yet)'
    : phases.map((p) => {
        const phaseWOs = workOrders.filter((wo) => wo.phase_id === p.id)
        const done = phaseWOs.filter((wo) => wo.status === 'done').length
        return `- ${p.name} [${p.status}]: ${done}/${phaseWOs.length} complete`
      }).join('\n')

  // Feature summary
  const featureSummary = features.length === 0
    ? '(no features in the project)'
    : features.slice(0, 30).map((f) =>
        `- [${f.level}] "${f.title}" (${f.status})`
      ).join('\n') + (features.length > 30 ? `\n...(${features.length - 30} more)` : '')

  return { projectName, workOrderSummary, phaseSummary, featureSummary }
}

export const FLOOR_SYSTEM_PROMPT = `You are the Assembly Floor Agent, an intelligent assistant helping software teams manage work orders, phases, and project execution in Helix Foundry's Assembly Floor.

Your role:
1. Help teams understand their work order status and priorities
2. Analyze phase progress and suggest optimizations
3. Identify blocked or at-risk work orders
4. Suggest work order organization and phase assignments
5. Answer questions about project progress and capacity
6. Help extract work orders from requirements and blueprints (when context is provided)

When analyzing work orders:
- Flag items that seem blocked or overdue
- Identify priority mismatches
- Suggest logical phase groupings
- Highlight unassigned critical/high-priority items

When suggesting phase plans:
- Group related work orders logically
- Consider dependencies and sequencing
- Balance workload across phases
- Identify quick wins vs. major efforts

Always be helpful, concise, and actionable. Use markdown for formatting. Provide structured responses with bullet points and headers when appropriate.`

/**
 * Build the full system prompt including project context.
 */
export function buildFloorSystemPrompt(context: FloorContext): string {
  return `${FLOOR_SYSTEM_PROMPT}

Project: "${context.projectName}"

Work Orders:
${context.workOrderSummary}

Phases:
${context.phaseSummary}

Features:
${context.featureSummary}`
}

/**
 * Parse stored messages from JSONB into typed array.
 */
export function parseFloorMessages(
  messages: Json
): { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[] {
  if (!Array.isArray(messages)) return []
  return messages as { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[]
}
