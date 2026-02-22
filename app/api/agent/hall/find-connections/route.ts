import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/agent/hall/find-connections
 * Analyze one idea against all others in the project to discover connections.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { projectId, ideaId } = await request.json()

    if (!projectId || !ideaId) {
      return Response.json({ error: 'projectId and ideaId required' }, { status: 400 })
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

    // Fetch source idea
    const { data: sourceIdea } = await supabase
      .from('ideas')
      .select('id, title, body, status')
      .eq('id', ideaId)
      .eq('project_id', projectId)
      .single()

    if (!sourceIdea) {
      return Response.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Fetch other ideas in the project
    const { data: otherIdeas } = await supabase
      .from('ideas')
      .select('id, title, body, status, created_at')
      .eq('project_id', projectId)
      .neq('id', ideaId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!otherIdeas || otherIdeas.length === 0) {
      return Response.json({ sourceIdeaId: ideaId, connections: [] })
    }

    // Fetch existing connections to exclude them from suggestions
    const { data: existingOut } = await supabase
      .from('idea_connections')
      .select('target_idea_id')
      .eq('source_idea_id', ideaId)

    const { data: existingIn } = await supabase
      .from('idea_connections')
      .select('source_idea_id')
      .eq('target_idea_id', ideaId)

    const alreadyConnected = new Set([
      ...(existingOut || []).map((c) => c.target_idea_id),
      ...(existingIn || []).map((c) => c.source_idea_id),
    ])

    // Filter out already-connected ideas
    const candidates = otherIdeas.filter((i) => !alreadyConnected.has(i.id))

    if (candidates.length === 0) {
      return Response.json({ sourceIdeaId: ideaId, connections: [] })
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ sourceIdeaId: ideaId, connections: [] })
    }

    const client = new Anthropic({ apiKey })

    const prompt = `You are analyzing product ideas to discover connections.

SOURCE idea:
Title: "${sourceIdea.title}"
${sourceIdea.body ? `Body: "${sourceIdea.body}"` : '(no body)'}

OTHER ideas to compare against:
${candidates.slice(0, 30).map((c, i) => `${i + 1}. [ID:${c.id}] "${c.title}"${c.body ? `: ${c.body.slice(0, 200)}` : ''}`).join('\n')}

For each idea that is meaningfully connected to the SOURCE idea, classify the connection:
- "related": Ideas discuss similar concepts (bidirectional)
- "extends": The other idea builds on or extends the source idea
- "duplicates": Nearly the same concept

Rate confidence 0-100. Only include ideas scoring 60+.

Return ONLY a valid JSON array (empty [] if no connections):
[{"id": "...", "type": "related", "confidence": 85, "reasoning": "brief explanation"}]`

    let aiResults: { id: string; type: string; confidence: number; reasoning: string }[] = []

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = response.content[0]
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (Array.isArray(parsed)) {
            aiResults = parsed.filter(
              (r: { confidence: number; type: string }) =>
                r.confidence >= 60 &&
                ['related', 'extends', 'duplicates'].includes(r.type)
            )
          }
        }
      }
    } catch {
      // AI failed — return empty
      return Response.json({ sourceIdeaId: ideaId, connections: [] })
    }

    // Enrich with idea details
    const candidateMap = new Map(candidates.map((c) => [c.id, c]))
    const connections = aiResults
      .map((ai) => {
        const idea = candidateMap.get(ai.id)
        if (!idea) return null
        return {
          ideaId: idea.id,
          title: idea.title,
          preview: (idea.body || '').slice(0, 150),
          connectionType: ai.type,
          confidence: ai.confidence / 100,
          reasoning: ai.reasoning,
          createdAt: idea.created_at,
        }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)

    return Response.json({ sourceIdeaId: ideaId, connections })
  } catch (err) {
    return handleAuthError(err)
  }
}
