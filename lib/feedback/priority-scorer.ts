import { createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

interface PriorityComponents {
  frequency: number      // 0-30
  severity: number       // 0-40
  featureImportance: number // 0-30
  frequencyDetail: string
  severityDetail: string
  featureDetail: string
}

type PriorityTier = 'low' | 'medium' | 'high' | 'critical'

const SEVERITY_KEYWORDS = [
  'critical', 'broken', 'blocking', 'urgent', 'blocked', 'crash', 'error',
  'down', 'outage', 'unusable', 'impossible', 'fails', 'failure', 'fatal',
  'lost data', 'data loss', 'security', 'vulnerability',
]

const MODERATE_KEYWORDS = [
  'bug', 'issue', 'problem', 'slow', 'laggy', 'wrong', 'incorrect',
  'confusing', 'frustrated', 'annoying', 'difficult', 'broken',
]

function getTier(score: number): PriorityTier {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

/**
 * Calculate frequency score (0-30).
 * Counts similar feedback (same category) in the project within the last 30 days.
 */
function calculateFrequencyScore(
  similarCount: number
): { score: number; detail: string } {
  let score: number
  if (similarCount >= 20) score = 30
  else if (similarCount >= 11) score = 20
  else if (similarCount >= 6) score = 15
  else if (similarCount >= 3) score = 10
  else if (similarCount >= 1) score = 5
  else score = 0

  const detail = similarCount > 0
    ? `${similarCount} similar items in last 30 days`
    : 'No similar items found recently'

  return { score, detail }
}

/**
 * Calculate severity score (0-40).
 * Uses keyword analysis, existing AI score, and category.
 */
function calculateSeverityScore(
  content: string,
  category: string,
  existingScore: number | null
): { score: number; detail: string } {
  const lower = content.toLowerCase()
  let score = 0
  const factors: string[] = []

  // Keyword analysis
  const criticalHits = SEVERITY_KEYWORDS.filter((kw) => lower.includes(kw))
  const moderateHits = MODERATE_KEYWORDS.filter((kw) => lower.includes(kw))

  if (criticalHits.length >= 3) {
    score += 20
    factors.push(`Critical keywords: ${criticalHits.slice(0, 3).join(', ')}`)
  } else if (criticalHits.length >= 1) {
    score += 12
    factors.push(`Severity keyword: ${criticalHits[0]}`)
  } else if (moderateHits.length >= 2) {
    score += 6
    factors.push(`Issue keywords detected`)
  }

  // Existing AI score mapping (0-100 → 0-12)
  if (existingScore != null) {
    const aiContribution = Math.round((existingScore / 100) * 12)
    score += aiContribution
    if (existingScore >= 70) {
      factors.push(`High AI severity score (${existingScore})`)
    } else if (existingScore >= 40) {
      factors.push(`Moderate AI severity (${existingScore})`)
    }
  }

  // Category bonus
  if (category === 'bug') {
    score += 8
    factors.push('Bug report')
  } else if (category === 'performance') {
    score += 5
    factors.push('Performance issue')
  } else if (category === 'ux_issue') {
    score += 3
    factors.push('UX issue')
  } else if (category === 'feature_request') {
    score += 2
  }

  score = Math.min(40, score)
  const detail = factors.length > 0 ? factors.join('; ') : 'Low severity'

  return { score, detail }
}

/**
 * Calculate feature importance score (0-30).
 * Based on how many entity connections and work orders relate to the feedback's category.
 */
function calculateFeatureImportanceScore(
  connectionCount: number,
  hasConversion: boolean
): { score: number; detail: string } {
  let score = 0
  const factors: string[] = []

  if (hasConversion) {
    score += 15
    factors.push('Already converted to work item')
  }

  if (connectionCount >= 5) {
    score += 15
    factors.push(`${connectionCount} entity connections`)
  } else if (connectionCount >= 3) {
    score += 10
    factors.push(`${connectionCount} entity connections`)
  } else if (connectionCount >= 1) {
    score += 5
    factors.push(`${connectionCount} entity connection(s)`)
  }

  score = Math.min(30, score)
  const detail = factors.length > 0 ? factors.join('; ') : 'No linked features'

  return { score, detail }
}

/**
 * Calculate and persist priority score for a feedback item.
 */
export async function calculatePriority(feedbackId: string): Promise<void> {
  const supabase = createServiceClient()

  // Fetch the feedback
  const { data: feedback } = await supabase
    .from('feedback_submissions')
    .select('id, project_id, content, category, score, status, converted_to_work_order_id, converted_to_feature_id, created_at')
    .eq('id', feedbackId)
    .single()

  if (!feedback) return

  // Count similar feedback (same category, same project, last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { count: similarCount } = await supabase
    .from('feedback_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', feedback.project_id)
    .eq('category', feedback.category)
    .neq('id', feedbackId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Count entity connections for this feedback
  const { count: connectionCount } = await supabase
    .from('entity_connections')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', feedback.project_id)
    .or(`and(source_type.eq.feedback,source_id.eq.${feedbackId}),and(target_type.eq.feedback,target_id.eq.${feedbackId})`)

  const hasConversion = !!(feedback.converted_to_work_order_id || feedback.converted_to_feature_id)

  const freq = calculateFrequencyScore(similarCount || 0)
  const sev = calculateSeverityScore(feedback.content, feedback.category, feedback.score)
  const feat = calculateFeatureImportanceScore(connectionCount || 0, hasConversion)

  const totalScore = Math.min(100, freq.score + sev.score + feat.score)
  const tier = getTier(totalScore)

  const components: PriorityComponents = {
    frequency: freq.score,
    severity: sev.score,
    featureImportance: feat.score,
    frequencyDetail: freq.detail,
    severityDetail: sev.detail,
    featureDetail: feat.detail,
  }

  await supabase
    .from('feedback_submissions')
    .update({
      priority_score: totalScore,
      priority_tier: tier,
      priority_components: components as unknown as Json,
      priority_updated_at: new Date().toISOString(),
    })
    .eq('id', feedbackId)
}

/**
 * Recalculate priority for all feedback in a project.
 */
export async function recalculateProjectPriority(projectId: string): Promise<number> {
  const supabase = createServiceClient()

  const { data: items } = await supabase
    .from('feedback_submissions')
    .select('id')
    .eq('project_id', projectId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!items || items.length === 0) return 0

  for (const item of items) {
    await calculatePriority(item.id)
  }

  return items.length
}
