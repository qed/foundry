import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { scanForConnections } from '@/lib/knowledge-graph/detection'
import type { GraphEntityType } from '@/types/database'

const VALID_ENTITY_TYPES: GraphEntityType[] = [
  'idea', 'feature', 'blueprint', 'work_order', 'feedback', 'artifact',
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { sourceType, sourceId, content, title } = body
    const supabase = createServiceClient()

    // Validate inputs
    if (!sourceType || !VALID_ENTITY_TYPES.includes(sourceType)) {
      return Response.json({ error: 'Invalid sourceType' }, { status: 400 })
    }
    if (!sourceId) {
      return Response.json({ error: 'sourceId is required' }, { status: 400 })
    }
    if (!content && !title) {
      return Response.json({ error: 'content or title is required' }, { status: 400 })
    }

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

    // Flatten content if it's JSON (blueprint content is JSONB)
    let textContent = ''
    if (typeof content === 'string') {
      textContent = content
    } else if (content && typeof content === 'object') {
      textContent = extractTextFromJson(content)
    }

    const suggestions = await scanForConnections(
      projectId,
      sourceType as GraphEntityType,
      sourceId,
      textContent,
      title
    )

    return Response.json({
      suggestions,
      count: suggestions.length,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * Recursively extract text content from JSON (e.g., TipTap/ProseMirror JSON).
 * Walks the tree and concatenates all text nodes.
 */
function extractTextFromJson(obj: unknown): string {
  if (!obj) return ''
  if (typeof obj === 'string') return obj

  if (Array.isArray(obj)) {
    return obj.map(extractTextFromJson).join(' ')
  }

  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>

    // TipTap text node
    if (record.type === 'text' && typeof record.text === 'string') {
      return record.text
    }

    // Recurse into content/children arrays
    const parts: string[] = []
    if (record.content) parts.push(extractTextFromJson(record.content))
    if (record.children) parts.push(extractTextFromJson(record.children))
    if (record.text && typeof record.text === 'string') parts.push(record.text)

    // If nothing found in common keys, try all values
    if (parts.length === 0) {
      for (const val of Object.values(record)) {
        if (typeof val === 'string' && val.length > 2) {
          parts.push(val)
        } else if (typeof val === 'object' && val !== null) {
          parts.push(extractTextFromJson(val))
        }
      }
    }

    return parts.join(' ')
  }

  return ''
}
