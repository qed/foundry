import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/agent/hall/detect-duplicates
 * Detect potential duplicate ideas using keyword overlap + AI semantic analysis.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { projectId, ideaId, ideaTitle, ideaBody } = await request.json()

    if (!projectId || !ideaId || !ideaTitle?.trim()) {
      return Response.json({ error: 'projectId, ideaId, and ideaTitle required' }, { status: 400 })
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

    // Fetch existing ideas (excluding the new one)
    const { data: existingIdeas } = await supabase
      .from('ideas')
      .select('id, title, body, status, created_at')
      .eq('project_id', projectId)
      .neq('id', ideaId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!existingIdeas || existingIdeas.length === 0) {
      return Response.json({ duplicates: [] })
    }

    // Step 1: Keyword-based similarity (fast pre-filter)
    const newKeywords = extractKeywords(`${ideaTitle} ${ideaBody || ''}`)

    const candidates = existingIdeas
      .map((idea) => ({
        ...idea,
        similarity: jaccardSimilarity(
          newKeywords,
          extractKeywords(`${idea.title} ${idea.body || ''}`)
        ),
      }))
      .filter((idea) => idea.similarity > 0.15) // Low threshold — AI refines
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 8) // Top 8 for AI analysis

    if (candidates.length === 0) {
      return Response.json({ duplicates: [] })
    }

    // Step 2: AI semantic analysis for top candidates
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // No API key — fall back to keyword-only results
      const keywordOnly = candidates
        .filter((c) => c.similarity > 0.4)
        .slice(0, 5)
        .map((c) => ({
          ideaId: c.id,
          title: c.title,
          preview: (c.body || '').slice(0, 150),
          similarity: c.similarity,
          reason: `${Math.round(c.similarity * 100)}% keyword overlap`,
          createdAt: c.created_at,
        }))
      return Response.json({ duplicates: keywordOnly })
    }

    const client = new Anthropic({ apiKey })

    const prompt = `You are analyzing product ideas for duplicates.

NEW idea:
Title: "${ideaTitle}"
${ideaBody ? `Body: "${ideaBody}"` : '(no body)'}

EXISTING ideas to compare against:
${candidates.map((c, i) => `${i + 1}. [ID:${c.id}] "${c.title}"${c.body ? `: ${c.body.slice(0, 200)}` : ''}`).join('\n')}

For each existing idea, rate semantic similarity to the NEW idea on a 0-100 scale:
- 80-100: Likely duplicate (same core concept)
- 60-79: Highly related (overlapping concepts)
- 40-59: Somewhat related
- 0-39: Not similar

Only include ideas scoring 50+. Return ONLY a valid JSON array:
[{"id": "...", "score": 85, "reason": "brief explanation"}]`

    let aiResults: { id: string; score: number; reason: string }[] = []

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = response.content[0]
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (Array.isArray(parsed)) {
            aiResults = parsed.filter(
              (r: { score: number }) => r.score >= 50
            )
          }
        }
      }
    } catch {
      // AI failed — fall back to keyword results
    }

    // Build final results: merge AI scores with candidate data
    let duplicates: {
      ideaId: string
      title: string
      preview: string
      similarity: number
      reason: string
      createdAt: string
    }[]

    if (aiResults.length > 0) {
      const candidateMap = new Map(candidates.map((c) => [c.id, c]))
      duplicates = aiResults
        .map((ai) => {
          const candidate = candidateMap.get(ai.id)
          if (!candidate) return null
          return {
            ideaId: candidate.id,
            title: candidate.title,
            preview: (candidate.body || '').slice(0, 150),
            similarity: ai.score / 100,
            reason: ai.reason,
            createdAt: candidate.created_at,
          }
        })
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5)
    } else {
      // Fallback to keyword-only
      duplicates = candidates
        .filter((c) => c.similarity > 0.4)
        .slice(0, 5)
        .map((c) => ({
          ideaId: c.id,
          title: c.title,
          preview: (c.body || '').slice(0, 150),
          similarity: c.similarity,
          reason: `${Math.round(c.similarity * 100)}% keyword overlap`,
          createdAt: c.created_at,
        }))
    }

    return Response.json({ duplicates })
  } catch (err) {
    return handleAuthError(err)
  }
}

// ── Helpers ──────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'this', 'that', 'are', 'was',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'can', 'not', 'no', 'we', 'our', 'need',
  'want', 'like', 'also', 'very', 'just', 'more', 'some', 'than', 'into',
])

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let intersection = 0
  for (const word of a) {
    if (b.has(word)) intersection++
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}
