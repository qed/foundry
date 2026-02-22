import type { Json } from '@/types/database'

interface FeatureNodeForContext {
  id: string
  title: string
  level: string
  status: string
  parent_id: string | null
}

export interface ShopContext {
  projectName: string
  featureTree: string
  productOverview: string | null
  currentFrd: { title: string; content: string } | null
}

const LEVEL_LABELS: Record<string, string> = {
  epic: 'Epic',
  feature: 'Feature',
  sub_feature: 'Sub-feature',
  task: 'Task',
}

const LEVEL_INDENT: Record<string, number> = {
  epic: 0,
  feature: 1,
  sub_feature: 2,
  task: 3,
}

/**
 * Format feature nodes into a readable tree string.
 */
function formatTree(nodes: FeatureNodeForContext[]): string {
  if (nodes.length === 0) return '(empty — no features yet)'

  // Build children map
  const childrenMap = new Map<string | null, FeatureNodeForContext[]>()
  for (const node of nodes) {
    const siblings = childrenMap.get(node.parent_id) || []
    siblings.push(node)
    childrenMap.set(node.parent_id, siblings)
  }

  const lines: string[] = []
  function walk(parentId: string | null) {
    const children = childrenMap.get(parentId) || []
    for (const child of children) {
      const indent = '  '.repeat(LEVEL_INDENT[child.level] || 0)
      const label = LEVEL_LABELS[child.level] || child.level
      lines.push(`${indent}- [${label}] ${child.title} (${child.status})`)
      walk(child.id)
    }
  }
  walk(null)

  return lines.join('\n')
}

/**
 * Build context payload for the Pattern Shop agent.
 */
export function buildShopContext(
  projectName: string,
  nodes: FeatureNodeForContext[],
  productOverviewContent: string | null,
  currentFrd: { title: string; content: string } | null
): ShopContext {
  return {
    projectName,
    featureTree: formatTree(nodes),
    productOverview: productOverviewContent,
    currentFrd,
  }
}

export const SHOP_SYSTEM_PROMPT = `You are the Pattern Shop Agent, an expert requirements and product decomposition assistant for Helix Foundry's Pattern Shop — where teams structure their product vision into feature trees and requirements documents.

Your role:
1. Generate feature trees from project briefs or descriptions (Epic → Feature → Sub-feature → Task)
2. Review Feature Requirements Documents (FRDs) for gaps, ambiguities, and testability
3. Detect missing requirements by comparing feature trees against product overviews
4. Suggest improvements to requirements and feature definitions
5. Help teams decompose vague ideas into concrete, implementable work

## Generating Feature Trees

When the user asks you to "generate a feature tree", "create a feature tree", "decompose the brief", or similar commands, you MUST respond with a JSON block wrapped in \`\`\`json fences. The JSON must follow this exact structure:

\`\`\`json
{
  "action": "generate_tree",
  "tree": {
    "nodes": [
      {
        "id": "proposed-1",
        "title": "Epic Title",
        "description": "Brief description of this epic",
        "level": "epic",
        "children": [
          {
            "id": "proposed-1-1",
            "title": "Feature Title",
            "description": "Brief description",
            "level": "feature",
            "children": []
          }
        ]
      }
    ],
    "summary": "Generated X epics, Y features, Z sub-features, and W tasks"
  }
}
\`\`\`

Rules for tree generation:
- Structure: Epic (top-level goal) → Feature (major capability) → Sub-feature (component) → Task (implementable work)
- Each node MUST have a unique id starting with "proposed-"
- Each node MUST have title, description, level, and children (empty array if leaf)
- Valid levels are: "epic", "feature", "sub_feature", "task"
- Epics are root nodes, features are children of epics, sub_features of features, tasks of sub_features or features
- Keep titles concise and actionable (3-8 words)
- Descriptions should be 1-2 sentences explaining the scope
- Aim for 2-5 epics with 2-6 features each for a typical project
- Include a summary counting nodes at each level
- IMPORTANT: The JSON block must be the ONLY content in your response when generating a tree. Do not add text before or after the JSON.

## Other Conversations

When NOT generating a tree (reviewing requirements, detecting gaps, general discussion):
- Use markdown for formatting
- Reference specific nodes, sections, or requirements by name
- Be constructive, specific, and actionable

When reviewing requirements:
- Check for: ambiguous language, missing acceptance criteria, untestable requirements, vague scope
- Highlight specific issues
- Suggest concrete improvements

When detecting gaps:
- Compare the feature tree against the product overview
- Identify requirements not covered by the tree
- Suggest new nodes to add`

/**
 * Build the full system prompt including project context.
 */
export function buildShopSystemPrompt(context: ShopContext): string {
  let prompt = SHOP_SYSTEM_PROMPT

  prompt += `\n\nProject: "${context.projectName}"`

  prompt += `\n\nCurrent Feature Tree:\n${context.featureTree}`

  if (context.productOverview) {
    // Truncate to avoid token overflow
    const overview = context.productOverview.length > 3000
      ? context.productOverview.slice(0, 3000) + '\n...(truncated)'
      : context.productOverview
    prompt += `\n\nProduct Overview:\n${overview}`
  }

  if (context.currentFrd) {
    const frdContent = context.currentFrd.content.length > 3000
      ? context.currentFrd.content.slice(0, 3000) + '\n...(truncated)'
      : context.currentFrd.content
    prompt += `\n\nCurrently Viewing FRD: "${context.currentFrd.title}"\n${frdContent}`
  }

  return prompt
}

/**
 * Parse stored messages from JSONB into typed array.
 */
export function parseShopMessages(
  messages: Json
): { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[] {
  if (!Array.isArray(messages)) return []
  return messages as { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[]
}
