import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

export interface EnrichmentSuggestedFeature {
  id: string
  name: string
  matchScore: number
  matchReason: string
}

export interface EnrichmentRelatedFeedback {
  id: string
  similarity: number
  contentPreview: string
}

export interface FeedbackEnrichment {
  summary: string
  keyIssues: string[]
  affectedComponents: string[]
  suggestedFeatures: EnrichmentSuggestedFeature[]
  relatedFeedback: EnrichmentRelatedFeedback[]
  duplicateRisk: {
    isDuplicate: boolean
    confidence: number
    relatedFeedbackIds: string[]
  }
  enrichedAt: string
}

export async function enrichFeedback(
  feedbackId: string
): Promise<FeedbackEnrichment | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set')
    return null
  }

  const supabase = await createServiceClient()

  // Fetch the target feedback
  const { data: feedback, error } = await supabase
    .from('feedback_submissions')
    .select('*')
    .eq('id', feedbackId)
    .single()

  if (error || !feedback) return null

  // Fetch other feedback in the project for comparison (up to 100)
  const { data: otherFeedback } = await supabase
    .from('feedback_submissions')
    .select('id, content, category, tags, status')
    .eq('project_id', feedback.project_id)
    .neq('id', feedbackId)
    .order('created_at', { ascending: false })
    .limit(100)

  // Fetch feature nodes for feature matching
  const { data: features } = await supabase
    .from('feature_nodes')
    .select('id, title, level, description, status')
    .eq('project_id', feedback.project_id)
    .is('deleted_at', null)
    .limit(50)

  const client = new Anthropic({ apiKey })

  const feedbackList = (otherFeedback || [])
    .map((f) => `[${f.id}] (${f.category}) ${(f.content || '').slice(0, 200)}`)
    .join('\n')

  const featureList = (features || [])
    .map(
      (f) =>
        `[${f.id}] ${f.title} (${f.level}) - ${(f.description || '').slice(0, 100)}`
    )
    .join('\n')

  const systemPrompt = `You are a feedback analysis expert. Analyze the provided user feedback and return a JSON object with these fields:

1. "summary": A concise 1-2 sentence summary of the core issue or request.
2. "keyIssues": An array of 3-5 distinct key problems or points identified (strings).
3. "affectedComponents": An array of application components, pages, or areas likely impacted (strings like "login", "checkout", "settings").
4. "suggestedFeatures": Match against the provided feature list. Array of objects with { "id": exact_feature_id_from_list, "name": feature_title, "matchScore": 0-100, "matchReason": brief_explanation }. Only include features with score > 50. Max 5 results.
5. "relatedFeedback": From the provided feedback list, identify items discussing similar problems. Array of objects with { "id": exact_feedback_id_from_list, "similarity": 0-100 }. Only include items with similarity > 60. Max 5 results.
6. "duplicateRisk": Object with { "isDuplicate": boolean (true if any item has >90 similarity), "confidence": 0-100, "relatedFeedbackIds": array of IDs with >80 similarity }.

Return ONLY valid JSON. No explanation or text outside the JSON object.`

  const userPrompt = `## Target Feedback
Content: ${feedback.content}
Category: ${feedback.category}
Submitter: ${feedback.submitter_name || feedback.submitter_email || 'Anonymous'}
Tags: ${((feedback.tags as string[]) || []).join(', ') || 'none'}

## Other Feedback in Project (compare against these)
${feedbackList || 'No other feedback yet.'}

## Feature Tree (match features from this list)
${featureList || 'No features defined yet.'}

Analyze the target feedback and return JSON.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') return null

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])

    // Build a lookup for content previews from other feedback
    const contentLookup = new Map(
      (otherFeedback || []).map((f) => [f.id, (f.content || '').slice(0, 100)])
    )

    // Validate and sanitize
    const enrichment: FeedbackEnrichment = {
      summary:
        typeof parsed.summary === 'string'
          ? parsed.summary.slice(0, 500)
          : '',
      keyIssues: Array.isArray(parsed.keyIssues)
        ? parsed.keyIssues.slice(0, 5).map(String)
        : [],
      affectedComponents: Array.isArray(parsed.affectedComponents)
        ? parsed.affectedComponents.slice(0, 10).map(String)
        : [],
      suggestedFeatures: Array.isArray(parsed.suggestedFeatures)
        ? parsed.suggestedFeatures
            .slice(0, 5)
            .map((f: Record<string, unknown>) => ({
              id: String(f.id || ''),
              name: String(f.name || ''),
              matchScore: Math.min(
                100,
                Math.max(0, Number(f.matchScore) || 0)
              ),
              matchReason: String(f.matchReason || ''),
            }))
        : [],
      relatedFeedback: Array.isArray(parsed.relatedFeedback)
        ? parsed.relatedFeedback
            .slice(0, 5)
            .map((f: Record<string, unknown>) => ({
              id: String(f.id || ''),
              similarity: Math.min(
                100,
                Math.max(0, Number(f.similarity) || 0)
              ),
              contentPreview: contentLookup.get(String(f.id || '')) || '',
            }))
        : [],
      duplicateRisk: {
        isDuplicate: Boolean(parsed.duplicateRisk?.isDuplicate),
        confidence: Math.min(
          100,
          Math.max(0, Number(parsed.duplicateRisk?.confidence) || 0)
        ),
        relatedFeedbackIds: Array.isArray(
          parsed.duplicateRisk?.relatedFeedbackIds
        )
          ? parsed.duplicateRisk.relatedFeedbackIds.map(String)
          : [],
      },
      enrichedAt: new Date().toISOString(),
    }

    // Store enrichment in database
    await supabase
      .from('feedback_submissions')
      .update({ enrichment: JSON.parse(JSON.stringify(enrichment)) })
      .eq('id', feedbackId)

    return enrichment
  } catch (err) {
    console.error('Enrichment failed:', err)
    return null
  }
}
