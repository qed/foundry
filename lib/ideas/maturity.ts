import { createServiceClient } from '@/lib/supabase/server'
import type { IdeaMaturityTier } from '@/types/database'

// --- Score Calculation ---

interface MaturityInput {
  body: string | null
  tagCount: number
  connectionCount: number
  artifactCount: number
  commentCount: number
  viewCount: number
  createdAt: string
}

export interface MaturityBreakdown {
  completeness: number
  engagement: number
  age: number
  total: number
  tier: IdeaMaturityTier
}

/**
 * Calculate maturity score for an idea based on completeness, engagement, and age.
 * Returns a breakdown of each category and the final score/tier.
 */
export function calculateMaturity(input: MaturityInput): MaturityBreakdown {
  // Completeness (0-40)
  let completeness = 0
  if (input.body && input.body.length > 100) completeness += 10
  if (input.tagCount >= 2) completeness += 10
  if (input.connectionCount >= 1) completeness += 10
  if (input.artifactCount >= 1) completeness += 10

  // Engagement (0-40)
  let engagement = 0

  // Comments: 1-5 = 5pts, 6-10 = 10pts, 11-20 = 15pts, 20+ = 20pts
  if (input.commentCount >= 20) engagement += 20
  else if (input.commentCount >= 11) engagement += 15
  else if (input.commentCount >= 6) engagement += 10
  else if (input.commentCount >= 1) engagement += 5

  // Views: 1-10 = 5pts, 11-50 = 10pts, 51-100 = 15pts, 100+ = 20pts
  if (input.viewCount >= 100) engagement += 20
  else if (input.viewCount >= 51) engagement += 15
  else if (input.viewCount >= 11) engagement += 10
  else if (input.viewCount >= 1) engagement += 5

  // Age (0-20) — fresher ideas score higher (momentum matters)
  let age = 0
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(input.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceCreation < 7) age = 20
  else if (daysSinceCreation <= 30) age = 15
  else if (daysSinceCreation <= 90) age = 10
  else age = 5

  const total = completeness + engagement + age
  const tier: IdeaMaturityTier =
    total >= 67 ? 'mature' : total >= 34 ? 'developing' : 'raw'

  return { completeness, engagement, age, total, tier }
}

// --- Database Recalculation ---

const RECALC_DEBOUNCE_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Recalculate maturity for a single idea. Debounced to max once per 5 minutes.
 * Fire-and-forget — never throws.
 */
export async function recalculateIdeaMaturity(ideaId: string): Promise<MaturityBreakdown | null> {
  try {
    const supabase = createServiceClient()

    // Fetch current idea
    const { data: idea } = await supabase
      .from('ideas')
      .select('id, body, created_at, view_count, maturity_updated_at')
      .eq('id', ideaId)
      .single()

    if (!idea) return null

    // Check debounce
    if (idea.maturity_updated_at) {
      const elapsed = Date.now() - new Date(idea.maturity_updated_at).getTime()
      if (elapsed < RECALC_DEBOUNCE_MS) return null
    }

    // Count tags
    const { count: tagCount } = await supabase
      .from('idea_tags')
      .select('*', { count: 'exact', head: true })
      .eq('idea_id', ideaId)

    // Count comments
    const { count: commentCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', 'idea')
      .eq('entity_id', ideaId)
      .is('deleted_at', null)

    // Count entity connections (both directions)
    const { count: outCount } = await supabase
      .from('entity_connections')
      .select('*', { count: 'exact', head: true })
      .eq('source_type', 'idea')
      .eq('source_id', ideaId)

    const { count: inCount } = await supabase
      .from('entity_connections')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', 'idea')
      .eq('target_id', ideaId)

    // Count idea_connections (legacy)
    const { count: ideaConnCount } = await supabase
      .from('idea_connections')
      .select('*', { count: 'exact', head: true })
      .or(`source_idea_id.eq.${ideaId},target_idea_id.eq.${ideaId}`)

    // Count linked artifacts
    const { count: artifactCount } = await supabase
      .from('artifact_entity_links')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', 'idea')
      .eq('entity_id', ideaId)

    const connectionCount = (outCount || 0) + (inCount || 0) + (ideaConnCount || 0)

    const breakdown = calculateMaturity({
      body: idea.body,
      tagCount: tagCount || 0,
      connectionCount,
      artifactCount: artifactCount || 0,
      commentCount: commentCount || 0,
      viewCount: idea.view_count || 0,
      createdAt: idea.created_at,
    })

    // Persist
    await supabase
      .from('ideas')
      .update({
        maturity_score: breakdown.total,
        maturity_tier: breakdown.tier,
        maturity_completeness: breakdown.completeness,
        maturity_engagement: breakdown.engagement,
        maturity_age: breakdown.age,
        maturity_updated_at: new Date().toISOString(),
      })
      .eq('id', ideaId)

    return breakdown
  } catch (err) {
    console.error('Error recalculating maturity:', err)
    return null
  }
}

/**
 * Batch recalculate maturity for all ideas in a project.
 * Used for initial migration and periodic refresh.
 */
export async function recalculateProjectMaturity(projectId: string): Promise<number> {
  const supabase = createServiceClient()

  const { data: ideas } = await supabase
    .from('ideas')
    .select('id')
    .eq('project_id', projectId)
    .not('status', 'in', '("archived")')

  if (!ideas) return 0

  let count = 0
  for (const idea of ideas) {
    const result = await recalculateIdeaMaturity(idea.id)
    if (result) count++
  }
  return count
}
