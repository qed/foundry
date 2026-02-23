import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

export interface ConversionSuggestion {
  type: 'work_order' | 'feature' | 'monitor'
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  effort: 'xs' | 's' | 'm' | 'l' | 'xl'
  impact: number
  feedbackIds: string[]
  reasoning: string
  suggestedParentFeature?: string
}

export interface DuplicateGroup {
  title: string
  feedbackIds: string[]
  similarity: number
}

export interface CategoryTrend {
  category: string
  trend: 'increasing' | 'stable' | 'decreasing'
  thisWeek: number
  lastWeek: number
}

export interface ConversionSuggestionsResult {
  recommendations: ConversionSuggestion[]
  duplicateGroups: DuplicateGroup[]
  trends: CategoryTrend[]
  summary: string
  generatedAt: string
}

/**
 * Compute category trends by comparing the last 7 days vs the previous 7 days.
 */
function computeTrends(
  feedback: { category: string; created_at: string }[]
): CategoryTrend[] {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const thisWeekCounts: Record<string, number> = {}
  const lastWeekCounts: Record<string, number> = {}
  const allCategories = new Set<string>()

  for (const fb of feedback) {
    const date = new Date(fb.created_at)
    allCategories.add(fb.category)

    if (date >= oneWeekAgo) {
      thisWeekCounts[fb.category] = (thisWeekCounts[fb.category] || 0) + 1
    } else if (date >= twoWeeksAgo) {
      lastWeekCounts[fb.category] = (lastWeekCounts[fb.category] || 0) + 1
    }
  }

  return Array.from(allCategories).map((category) => {
    const thisWeek = thisWeekCounts[category] || 0
    const lastWeek = lastWeekCounts[category] || 0
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable'
    if (thisWeek > lastWeek + 1) trend = 'increasing'
    else if (thisWeek < lastWeek - 1) trend = 'decreasing'
    return { category, trend, thisWeek, lastWeek }
  })
}

export async function generateConversionSuggestions(
  projectId: string
): Promise<ConversionSuggestionsResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set')
    return null
  }

  const supabase = await createServiceClient()

  // Load all non-archived feedback
  const { data: feedback } = await supabase
    .from('feedback_submissions')
    .select(
      'id, content, category, status, score, tags, submitter_name, created_at, converted_to_work_order_id, converted_to_feature_id'
    )
    .eq('project_id', projectId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(200)

  if (!feedback || feedback.length === 0) {
    return {
      recommendations: [],
      duplicateGroups: [],
      trends: [],
      summary: 'No feedback items to analyze.',
      generatedAt: new Date().toISOString(),
    }
  }

  // Load feature tree
  const { data: features } = await supabase
    .from('feature_nodes')
    .select('id, title, level, description, status')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .limit(50)

  // Compute trends server-side
  const trends = computeTrends(feedback)

  // Only include unconverted feedback for recommendation analysis
  const unconverted = feedback.filter(
    (f) => !f.converted_to_work_order_id && !f.converted_to_feature_id
  )

  if (unconverted.length === 0) {
    return {
      recommendations: [],
      duplicateGroups: [],
      trends,
      summary: 'All feedback items have been converted. No pending items to analyze.',
      generatedAt: new Date().toISOString(),
    }
  }

  // Build feedback list for Claude
  const feedbackList = unconverted
    .map(
      (f) =>
        `[${f.id}] (${f.category}${f.score !== null ? `, score:${f.score}` : ''}) ${f.status} | ${(f.content || '').slice(0, 250)}${(f.tags as string[] | null)?.length ? ` [tags: ${(f.tags as string[]).join(', ')}]` : ''}`
    )
    .join('\n')

  const featureList = (features || [])
    .map((f) => `[${f.id}] ${f.title} (${f.level}) - ${(f.description || '').slice(0, 80)}`)
    .join('\n')

  const trendSummary = trends
    .map((t) => `${t.category}: ${t.thisWeek} this week, ${t.lastWeek} last week (${t.trend})`)
    .join('\n')

  const client = new Anthropic({ apiKey })

  const systemPrompt = `You are a product prioritization expert. Analyze user feedback and generate conversion recommendations.

For each cluster of related feedback, recommend an action:
- "work_order": for bugs, performance issues, and specific problems needing fixes
- "feature": for feature requests and UX improvements needing new functionality
- "monitor": for items that need more data before action

Return ONLY valid JSON with these fields:
{
  "recommendations": [
    {
      "type": "work_order" | "feature" | "monitor",
      "title": "short actionable title",
      "description": "2-3 sentence description for the work order or feature",
      "priority": "critical" | "high" | "medium" | "low",
      "effort": "xs" | "s" | "m" | "l" | "xl",
      "impact": 0-100,
      "feedbackIds": ["exact IDs from the provided list"],
      "reasoning": "why this recommendation and priority",
      "suggestedParentFeature": "feature name from tree, if type is feature"
    }
  ],
  "duplicateGroups": [
    {
      "title": "description of the duplicate cluster",
      "feedbackIds": ["exact IDs"],
      "similarity": 80-100
    }
  ],
  "summary": "2-3 sentence overall analysis summary"
}

Rules:
- Maximum 8 recommendations, ranked by impact
- Only include feedback IDs that actually appear in the provided list
- Group similar feedback into single recommendations (cluster them)
- Priority: critical (blocking bugs), high (significant issues), medium (improvements), low (nice-to-haves)
- Effort: xs (< 1 hour), s (hours), m (1-2 days), l (3-5 days), xl (1+ week)
- For duplicates, only include groups with 2+ items and >80% similarity`

  const userPrompt = `## Unconverted Feedback (${unconverted.length} items)
${feedbackList}

## Feature Tree
${featureList || 'No features defined yet.'}

## Category Trends
${trendSummary || 'Not enough data for trends.'}

Analyze and return JSON.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') return null

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])

    // Valid feedback ID set for validation
    const validIds = new Set(unconverted.map((f) => f.id))
    const validPriorities = ['critical', 'high', 'medium', 'low']
    const validEfforts = ['xs', 's', 'm', 'l', 'xl']
    const validTypes = ['work_order', 'feature', 'monitor']

    const recommendations: ConversionSuggestion[] = Array.isArray(
      parsed.recommendations
    )
      ? parsed.recommendations.slice(0, 8).map(
          (r: Record<string, unknown>): ConversionSuggestion => ({
            type: validTypes.includes(r.type as string)
              ? (r.type as ConversionSuggestion['type'])
              : 'monitor',
            title: String(r.title || '').slice(0, 200),
            description: String(r.description || '').slice(0, 1000),
            priority: validPriorities.includes(r.priority as string)
              ? (r.priority as ConversionSuggestion['priority'])
              : 'medium',
            effort: validEfforts.includes(r.effort as string)
              ? (r.effort as ConversionSuggestion['effort'])
              : 'm',
            impact: Math.min(
              100,
              Math.max(0, Number(r.impact) || 50)
            ),
            feedbackIds: Array.isArray(r.feedbackIds)
              ? (r.feedbackIds as string[]).filter((id) => validIds.has(String(id))).map(String)
              : [],
            reasoning: String(r.reasoning || ''),
            suggestedParentFeature: r.suggestedParentFeature
              ? String(r.suggestedParentFeature)
              : undefined,
          })
        )
      : []

    const duplicateGroups: DuplicateGroup[] = Array.isArray(
      parsed.duplicateGroups
    )
      ? parsed.duplicateGroups
          .slice(0, 10)
          .map(
            (g: Record<string, unknown>): DuplicateGroup => ({
              title: String(g.title || ''),
              feedbackIds: Array.isArray(g.feedbackIds)
                ? (g.feedbackIds as string[]).filter((id) => validIds.has(String(id))).map(String)
                : [],
              similarity: Math.min(
                100,
                Math.max(0, Number(g.similarity) || 80)
              ),
            })
          )
          .filter((g: DuplicateGroup) => g.feedbackIds.length >= 2)
      : []

    return {
      recommendations: recommendations.filter((r) => r.feedbackIds.length > 0),
      duplicateGroups,
      trends,
      summary: String(parsed.summary || ''),
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('Conversion suggestions failed:', err)
    return null
  }
}
