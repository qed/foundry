'use strict'

export interface LabContext {
  projectName: string
  totalFeedback: number
  byCategory: Record<string, number>
  byStatus: Record<string, number>
  recentFeedback: {
    id: string
    content: string
    category: string
    status: string
    score: number | null
    tags: string[]
    submitterName: string | null
    createdAt: string
  }[]
  topTags: { name: string; count: number }[]
}

interface FeedbackRow {
  id: string
  content: string
  category: string
  status: string
  score: number | null
  tags: string[] | null
  submitter_name: string | null
  created_at: string
}

/**
 * Build context payload describing the Insights Lab's current state
 * for injection into the agent's system prompt.
 */
export function buildLabContext(
  projectName: string,
  feedback: FeedbackRow[]
): LabContext {
  // Category counts
  const byCategory: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  const tagCounts = new Map<string, number>()

  for (const fb of feedback) {
    byCategory[fb.category] = (byCategory[fb.category] || 0) + 1
    byStatus[fb.status] = (byStatus[fb.status] || 0) + 1

    if (fb.tags) {
      for (const tag of fb.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      }
    }
  }

  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }))

  return {
    projectName,
    totalFeedback: feedback.length,
    byCategory,
    byStatus,
    recentFeedback: feedback.slice(0, 100).map((fb) => ({
      id: fb.id,
      content: fb.content.slice(0, 300),
      category: fb.category,
      status: fb.status,
      score: fb.score,
      tags: fb.tags || [],
      submitterName: fb.submitter_name,
      createdAt: fb.created_at,
    })),
    topTags,
  }
}

export const LAB_SYSTEM_PROMPT = `You are the Insights Lab Agent, an AI assistant for Helix Foundry's Insights Lab — a feedback analysis system where teams collect, categorize, and act on user feedback.

Your role is to:
1. Help analyze and categorize user feedback
2. Identify patterns and trends across feedback submissions
3. Suggest which feedback should be converted to work orders or features
4. Detect potential duplicate or related submissions
5. Recommend priority levels based on frequency and severity
6. Provide actionable insights for product decisions

When analyzing feedback, consider:
- Category accuracy (bug, feature request, UX issue, performance, other)
- Severity and frequency of reported issues
- Overlap with existing feedback items
- Potential impact on users
- Alignment with existing features and work orders

When users ask about patterns or trends:
- Look for common themes across multiple submissions
- Highlight high-frequency issues
- Identify feedback clusters around specific features or flows
- Note any emerging patterns over time

Always be concise, helpful, and focused on actionable insights. Recommend actions but don't execute them — ask for confirmation first.

Format:
- Use markdown for formatting
- Use bullet points for lists
- Suggest specific actions or next steps
- Acknowledge uncertainty if you don't have enough context`

/**
 * Build the full system prompt including feedback context.
 */
export function buildLabSystemPrompt(context: LabContext): string {
  const categorySummary = Object.entries(context.byCategory)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(', ')

  const statusSummary = Object.entries(context.byStatus)
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ')

  const contextBlock = `

Here is the current state of feedback in the project "${context.projectName}":
- Total feedback: ${context.totalFeedback}
- By category: ${categorySummary || 'none yet'}
- By status: ${statusSummary || 'none yet'}
- Top tags: ${context.topTags.map((t) => `${t.name} (${t.count})`).join(', ') || 'none yet'}

Recent feedback:
${context.recentFeedback
  .map(
    (fb) =>
      `- [${fb.status}] [${fb.category}]${fb.score !== null ? ` (score: ${fb.score})` : ''} "${fb.content}"${fb.tags.length ? ` (tags: ${fb.tags.join(', ')})` : ''}${fb.submitterName ? ` — ${fb.submitterName}` : ''}`
  )
  .join('\n')}`

  return LAB_SYSTEM_PROMPT + contextBlock
}
