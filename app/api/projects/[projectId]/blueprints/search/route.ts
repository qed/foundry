import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { BlueprintType, BlueprintStatus } from '@/types/database'

const VALID_TYPES: BlueprintType[] = ['foundation', 'system_diagram', 'feature']
const VALID_STATUSES: BlueprintStatus[] = ['draft', 'in_review', 'approved', 'implemented']

/**
 * Extract plain text from TipTap JSONB content for snippets.
 */
function extractTextFromContent(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  const obj = content as Record<string, unknown>

  // Mermaid diagram content
  if (obj.code && typeof obj.code === 'string') {
    return obj.code
  }

  // TipTap JSON content - extract text nodes recursively
  const texts: string[] = []
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    if (n.text && typeof n.text === 'string') {
      texts.push(n.text)
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child)
    }
  }
  walk(content)
  return texts.join(' ')
}

/**
 * Generate a snippet around the first occurrence of a search term.
 */
function generateSnippet(text: string, query: string, maxLength = 150): string {
  if (!text || !query) return text.slice(0, maxLength)

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerText.indexOf(lowerQuery)

  if (idx === -1) return text.slice(0, maxLength)

  const start = Math.max(0, idx - 60)
  const end = Math.min(text.length, idx + query.length + 60)
  let snippet = text.slice(start, end)

  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'

  return snippet
}

/**
 * GET /api/projects/[projectId]/blueprints/search
 * Full-text search with filters.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
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

    const q = searchParams.get('q')?.trim() || ''
    const types = searchParams.get('type')?.split(',').filter((t) => VALID_TYPES.includes(t as BlueprintType)) || []
    const statuses = searchParams.get('status')?.split(',').filter((s) => VALID_STATUSES.includes(s as BlueprintStatus)) || []
    const createdBy = searchParams.get('created_by') || null
    const dateFrom = searchParams.get('date_from') || null
    const dateTo = searchParams.get('date_to') || null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build query
    let query = supabase
      .from('blueprints')
      .select('id, title, blueprint_type, status, feature_node_id, created_by, content, created_at, updated_at', { count: 'exact' })
      .eq('project_id', projectId)

    // Type filter
    if (types.length === 1) {
      query = query.eq('blueprint_type', types[0] as BlueprintType)
    } else if (types.length > 1) {
      query = query.in('blueprint_type', types as BlueprintType[])
    }

    // Status filter
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0] as BlueprintStatus)
    } else if (statuses.length > 1) {
      query = query.in('status', statuses as BlueprintStatus[])
    }

    // Author filter
    if (createdBy) {
      query = query.eq('created_by', createdBy)
    }

    // Date range filter
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
    }

    // Full-text search using tsvector
    if (q) {
      // Convert search terms to tsquery with OR for partial matching
      // Also add prefix matching with :* for partial words
      const terms = q.split(/\s+/).filter(Boolean)
      const tsquery = terms.map((t) => `${t}:*`).join(' | ')
      query = query.textSearch('search_tsvector', tsquery, { type: 'plain', config: 'english' })
    }

    // Order by relevance if searching, otherwise by date
    if (q) {
      query = query.order('updated_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: blueprints, error, count } = await query

    if (error) {
      console.error('Search error:', error)
      return Response.json({ error: 'Search failed' }, { status: 500 })
    }

    // For feature blueprints, fetch linked feature node names
    const featureNodeIds = (blueprints || [])
      .filter((bp) => bp.feature_node_id)
      .map((bp) => bp.feature_node_id as string)

    let featureNameMap: Record<string, string> = {}
    if (featureNodeIds.length > 0) {
      const { data: nodes } = await supabase
        .from('feature_nodes')
        .select('id, title')
        .in('id', featureNodeIds)
      if (nodes) {
        featureNameMap = Object.fromEntries(nodes.map((n) => [n.id, n.title]))
      }
    }

    // Build results with snippets
    const results = (blueprints || []).map((bp) => {
      const contentText = extractTextFromContent(bp.content)
      const snippet = q ? generateSnippet(contentText, q) : contentText.slice(0, 150)

      return {
        id: bp.id,
        title: bp.title,
        blueprint_type: bp.blueprint_type,
        status: bp.status,
        feature_node_id: bp.feature_node_id,
        feature_name: bp.feature_node_id ? featureNameMap[bp.feature_node_id] || null : null,
        created_by: bp.created_by,
        created_at: bp.created_at,
        updated_at: bp.updated_at,
        snippet: snippet || null,
      }
    })

    return Response.json({
      total: count || 0,
      results,
      limit,
      offset,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
