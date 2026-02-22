import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

interface ExistingTag {
  id: string
  name: string
  color: string
}

interface AISuggestion {
  name: string
  confidence: number
  isNew: boolean
  reasoning: string
}

const TAG_COLORS = [
  '#3B82F6', '#EF4444', '#A855F7', '#10B981',
  '#F59E0B', '#EC4899', '#06B6D4', '#F97316',
]

function pickColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
}

/**
 * POST /api/agent/hall/suggest-tags
 * Analyze idea content and suggest relevant tags.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { projectId, ideaTitle, ideaBody, existingTags } = await request.json()

    if (!projectId || !ideaTitle?.trim()) {
      return Response.json({ error: 'projectId and ideaTitle required' }, { status: 400 })
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
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Load recent ideas with their tags for context
    const { data: ideas } = await supabase
      .from('ideas')
      .select('title, body')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(30)

    const { data: tagData } = await supabase
      .from('idea_tags')
      .select('tags!inner(name)')
      .eq('ideas!inner.project_id', projectId)
      .limit(100)

    const usedTagNames = new Set(
      (tagData || []).map((row) => (row.tags as unknown as { name: string }).name)
    )

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ suggestions: [] })
    }

    const tags = (existingTags || []) as ExistingTag[]
    const tagNames = tags.map((t) => t.name)

    const systemPrompt = `You are a tagging assistant for a product idea management system.
Analyze the given idea and suggest 3-5 relevant tags.

Existing project tags: ${tagNames.length > 0 ? tagNames.join(', ') : '(none yet)'}
${usedTagNames.size > 0 ? `Frequently used tags: ${Array.from(usedTagNames).slice(0, 15).join(', ')}` : ''}

Rules:
- Prefer existing tags when they match the idea's topic
- Only suggest NEW tags if no existing tag covers the concept
- Each tag should be 1-3 words, lowercase-friendly
- Confidence: 85-100 for strong matches, 60-84 for moderate, below 60 skip
- Provide brief reasoning for each suggestion

Return ONLY a valid JSON array (no markdown, no extra text):
[
  { "name": "TagName", "confidence": 92, "isNew": false, "reasoning": "brief reason" }
]`

    const userPrompt = `Idea Title: ${ideaTitle.trim()}${ideaBody?.trim() ? `\nIdea Body: ${ideaBody.trim()}` : ''}

${ideas && ideas.length > 0
  ? `\nRecent ideas in this project for context:\n${ideas.slice(0, 10).map((i) => `- ${i.title}`).join('\n')}`
  : ''
}

Suggest 3-5 tags. Return ONLY the JSON array.`

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let suggestions: AISuggestion[] = []

    try {
      const content = response.content[0]
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (Array.isArray(parsed)) {
            suggestions = parsed
              .filter((s: AISuggestion) => s.name && s.confidence >= 50)
              .slice(0, 5)
          }
        }
      }
    } catch {
      // Parse error — return empty suggestions
    }

    // Enrich with tag IDs and colors
    const enriched = suggestions.map((sugg) => {
      const existing = tags.find(
        (t) => t.name.toLowerCase() === sugg.name.toLowerCase()
      )

      return {
        id: existing?.id || undefined,
        name: existing?.name || sugg.name,
        isNew: !existing,
        confidence: Math.min(100, Math.max(0, sugg.confidence)) / 100,
        suggestedColor: existing?.color || pickColor(),
        reasoning: sugg.reasoning || '',
      }
    })

    // Remove duplicates by name
    const seen = new Set<string>()
    const unique = enriched.filter((s) => {
      const key = s.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return Response.json({ suggestions: unique })
  } catch (err) {
    return handleAuthError(err)
  }
}
