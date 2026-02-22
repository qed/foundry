import type { Json } from '@/types/database'

interface IdeaForContext {
  id: string
  title: string
  body: string | null
  status: string
  created_at: string
}

interface TagCount {
  name: string
  count: number
}

export interface HallContext {
  projectName: string
  totalIdeas: number
  ideas: {
    id: string
    title: string
    body: string | null
    status: string
    tags: string[]
    createdAt: string
  }[]
  topTags: TagCount[]
}

/**
 * Build context payload describing the Hall's current state
 * for injection into the agent's system prompt.
 */
export function buildHallContext(
  projectName: string,
  ideas: IdeaForContext[],
  ideaTags: { idea_id: string; tag_name: string }[]
): HallContext {
  // Build tag map per idea
  const ideaTagMap = new Map<string, string[]>()
  for (const it of ideaTags) {
    const existing = ideaTagMap.get(it.idea_id) || []
    existing.push(it.tag_name)
    ideaTagMap.set(it.idea_id, existing)
  }

  // Count tags
  const tagCounts = new Map<string, number>()
  for (const it of ideaTags) {
    tagCounts.set(it.tag_name, (tagCounts.get(it.tag_name) || 0) + 1)
  }

  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }))

  return {
    projectName,
    totalIdeas: ideas.length,
    ideas: ideas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      body: idea.body,
      status: idea.status,
      tags: ideaTagMap.get(idea.id) || [],
      createdAt: idea.created_at,
    })),
    topTags,
  }
}

export const HALL_SYSTEM_PROMPT = `You are the Hall Agent, an AI assistant for Helix Foundry's Hall — a product idea intake system where business leaders capture raw ideas before formal processing.

Your role is to:
1. Help organize and connect product ideas
2. Analyze idea content for tags, duplicates, and relationships
3. Provide insights about the idea portfolio
4. Assist with idea refinement and context

When analyzing ideas, consider:
- Business value and impact potential
- Technical feasibility and dependencies
- Overlap and connections with existing ideas
- Clarity of problem statement and solution approach

Always be concise, helpful, and focused on practical improvements. Ask clarifying questions when needed.

Format:
- Use markdown for formatting
- Use bullet points for lists
- Suggest specific actions or next steps
- Acknowledge uncertainty if you don't have enough context`

/**
 * Build the full system prompt including idea context.
 */
export function buildSystemPrompt(context: HallContext): string {
  const contextBlock = `

Here is the current state of ideas in the project "${context.projectName}":
- Total ideas: ${context.totalIdeas}
- Top tags: ${context.topTags.map((t) => `${t.name} (${t.count})`).join(', ') || 'none yet'}

Ideas:
${context.ideas
  .map(
    (idea) =>
      `- [${idea.status}] "${idea.title}"${idea.tags.length ? ` (tags: ${idea.tags.join(', ')})` : ''}${idea.body ? `: ${idea.body.slice(0, 200)}` : ''}`
  )
  .join('\n')}`

  return HALL_SYSTEM_PROMPT + contextBlock
}

/**
 * Parse stored messages from JSONB into typed array.
 */
export function parseMessages(
  messages: Json
): { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[] {
  if (!Array.isArray(messages)) return []
  return messages as { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[]
}
