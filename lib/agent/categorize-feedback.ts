import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

interface CategorizationResult {
  category: string
  confidence: number
  reasoning: string
  suggestedTags: string[]
  score: number
  scoreReasoning: string
}

/**
 * Auto-categorize a feedback submission using Claude Haiku.
 * Assigns category, tags, priority score, and confidence.
 * Fire-and-forget safe — errors are logged, not thrown.
 */
export async function categorizeFeedback(feedbackId: string): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set — skipping auto-categorization')
    return
  }

  const supabase = createServiceClient()

  try {
    // Fetch the feedback item
    const { data: feedback, error: fetchErr } = await supabase
      .from('feedback_submissions')
      .select('*')
      .eq('id', feedbackId)
      .single()

    if (fetchErr || !feedback) {
      console.error('Failed to fetch feedback for categorization:', fetchErr)
      return
    }

    // Only categorize uncategorized items that haven't been AI-processed
    if (feedback.category !== 'uncategorized' || feedback.ai_suggested) {
      return
    }

    // Fetch similar previously categorized feedback for context
    const { data: similarFeedback } = await supabase
      .from('feedback_submissions')
      .select('content, category, score, tags')
      .eq('project_id', feedback.project_id)
      .neq('id', feedbackId)
      .neq('category', 'uncategorized')
      .order('created_at', { ascending: false })
      .limit(10)

    const meta = (feedback.metadata || {}) as Record<string, unknown>

    const systemPrompt = `You are a feedback categorization expert for a product development platform.
Analyze user feedback and categorize it accurately.

Return ONLY a valid JSON object (no markdown, no explanation outside JSON):
{
  "category": "bug" | "feature_request" | "ux_issue" | "performance" | "other",
  "confidence": <number 0-100>,
  "reasoning": "<brief explanation for why this category>",
  "suggestedTags": ["<tag1>", "<tag2>"],
  "score": <number 0-100 priority score>,
  "scoreReasoning": "<brief explanation for score>"
}

Category guidelines:
- bug: crashes, errors, broken features, things not working
- feature_request: new capabilities, wishes, additions
- ux_issue: confusing UI, hard to find, not intuitive
- performance: slow, lag, timeout, memory issues
- other: doesn't fit above categories

Priority scoring factors:
- Bug/performance issues score higher (+15-20 base)
- User impact described (+10-15)
- Multiple similar reports (+5-20)
- Detailed description (+5)
- Contact info provided (+5)

Tag guidelines:
- Extract 1-3 relevant tags from the content
- Include component/feature mentioned (e.g., "login", "checkout")
- Include severity if detectable (e.g., "blocking", "minor")
- Use lowercase, hyphenated format`

    const userPrompt = `Categorize this feedback:

Content: ${feedback.content}
${feedback.submitter_name ? `Submitter: ${feedback.submitter_name}` : ''}
${feedback.submitter_email ? `Email: ${feedback.submitter_email}` : ''}
${meta.browser ? `Browser: ${meta.browser}` : ''}
${meta.device ? `Device: ${meta.device}` : ''}
${meta.page_url ? `Page: ${meta.page_url}` : ''}

${similarFeedback && similarFeedback.length > 0
  ? `Similar categorized feedback in this project:\n${similarFeedback
      .slice(0, 5)
      .map((f) => `- [${f.category}${f.score != null ? `, score:${f.score}` : ''}] "${(f.content || '').slice(0, 100)}"`)
      .join('\n')}`
  : 'No previously categorized feedback yet.'
}

Return ONLY the JSON object.`

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let result: CategorizationResult | null = null

    try {
      const content = response.content[0]
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0])
        }
      }
    } catch {
      console.error('Failed to parse categorization response')
      return
    }

    if (!result) return

    // Validate and clamp values
    const validCategories = ['bug', 'feature_request', 'ux_issue', 'performance', 'other']
    const category = validCategories.includes(result.category) ? result.category : 'other'
    const confidence = Math.max(0, Math.min(100, Math.round(result.confidence || 50)))
    const score = Math.max(0, Math.min(100, Math.round(result.score || 50)))
    const tags = Array.isArray(result.suggestedTags)
      ? result.suggestedTags.filter((t): t is string => typeof t === 'string').slice(0, 5)
      : []

    const reasoning = JSON.stringify({
      confidence,
      reasoning: result.reasoning || '',
      scoreReasoning: result.scoreReasoning || '',
    })

    // Update the feedback record
    const { error: updateErr } = await supabase
      .from('feedback_submissions')
      .update({
        category: category as 'bug' | 'feature_request' | 'ux_issue' | 'performance' | 'other',
        tags,
        score,
        ai_suggested: true,
        categorization_reasoning: reasoning,
      })
      .eq('id', feedbackId)
      .eq('category', 'uncategorized') // Idempotency guard

    if (updateErr) {
      console.error('Failed to update feedback with categorization:', updateErr)
    }
  } catch (err) {
    console.error('Auto-categorization error:', err)
  }
}
