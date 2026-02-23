import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { GraphEntityType } from '@/types/database'

const VALID_ENTITY_TYPES: GraphEntityType[] = [
  'idea', 'feature', 'blueprint', 'work_order', 'feedback', 'artifact',
]

interface SearchResult {
  type: GraphEntityType
  id: string
  name: string
  status?: string
  already_linked?: boolean
}

/**
 * GET /api/projects/[projectId]/entity-search
 * Search across all entity types for the linking dialog.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')?.trim() || ''
    const excludeType = searchParams.get('exclude_type') as GraphEntityType | null
    const excludeId = searchParams.get('exclude_id')
    const typesParam = searchParams.get('types') // comma-separated filter
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

    if (query.length < 2) {
      return Response.json({ results: [], total_count: 0 })
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

    // Determine which entity types to search
    let searchTypes = [...VALID_ENTITY_TYPES]
    if (typesParam) {
      const filtered = typesParam.split(',').filter((t): t is GraphEntityType =>
        VALID_ENTITY_TYPES.includes(t as GraphEntityType)
      )
      if (filtered.length > 0) searchTypes = filtered
    }

    // Fetch existing connections for the source entity to mark already-linked
    const linkedIds: Set<string> = new Set()
    if (excludeType && excludeId) {
      const { data: existingOut } = await supabase
        .from('entity_connections')
        .select('target_type, target_id')
        .eq('project_id', projectId)
        .eq('source_type', excludeType)
        .eq('source_id', excludeId)

      const { data: existingIn } = await supabase
        .from('entity_connections')
        .select('source_type, source_id')
        .eq('project_id', projectId)
        .eq('target_type', excludeType)
        .eq('target_id', excludeId)

      for (const c of existingOut || []) linkedIds.add(`${c.target_type}:${c.target_id}`)
      for (const c of existingIn || []) linkedIds.add(`${c.source_type}:${c.source_id}`)
    }

    const ilike = `%${query}%`
    const results: SearchResult[] = []

    // Search each entity type in parallel using async wrappers
    const searches: Promise<void>[] = []

    if (searchTypes.includes('idea')) {
      searches.push((async () => {
        const { data } = await supabase.from('ideas').select('id, title, status').eq('project_id', projectId).ilike('title', ilike).limit(limit)
        for (const row of data || []) {
          if (excludeType === 'idea' && excludeId === row.id) continue
          results.push({ type: 'idea', id: row.id, name: row.title, status: row.status ?? undefined, already_linked: linkedIds.has(`idea:${row.id}`) })
        }
      })())
    }

    if (searchTypes.includes('feature')) {
      searches.push((async () => {
        const { data } = await supabase.from('feature_nodes').select('id, title, level').eq('project_id', projectId).ilike('title', ilike).limit(limit)
        for (const row of data || []) {
          if (excludeType === 'feature' && excludeId === row.id) continue
          results.push({ type: 'feature', id: row.id, name: row.title, status: row.level ?? undefined, already_linked: linkedIds.has(`feature:${row.id}`) })
        }
      })())
    }

    if (searchTypes.includes('blueprint')) {
      searches.push((async () => {
        const { data } = await supabase.from('blueprints').select('id, title, status, blueprint_type').eq('project_id', projectId).ilike('title', ilike).limit(limit)
        for (const row of data || []) {
          if (excludeType === 'blueprint' && excludeId === row.id) continue
          results.push({ type: 'blueprint', id: row.id, name: row.title, status: row.status ?? undefined, already_linked: linkedIds.has(`blueprint:${row.id}`) })
        }
      })())
    }

    if (searchTypes.includes('work_order')) {
      searches.push((async () => {
        const { data } = await supabase.from('work_orders').select('id, title, status').eq('project_id', projectId).ilike('title', ilike).limit(limit)
        for (const row of data || []) {
          if (excludeType === 'work_order' && excludeId === row.id) continue
          results.push({ type: 'work_order', id: row.id, name: row.title, status: row.status ?? undefined, already_linked: linkedIds.has(`work_order:${row.id}`) })
        }
      })())
    }

    if (searchTypes.includes('feedback')) {
      searches.push((async () => {
        const { data } = await supabase.from('feedback_submissions').select('id, content, status').eq('project_id', projectId).ilike('content', ilike).limit(limit)
        for (const row of data || []) {
          if (excludeType === 'feedback' && excludeId === row.id) continue
          const name = row.content && row.content.length > 60 ? row.content.substring(0, 60) + '...' : row.content || 'Untitled'
          results.push({ type: 'feedback', id: row.id, name, status: row.status ?? undefined, already_linked: linkedIds.has(`feedback:${row.id}`) })
        }
      })())
    }

    if (searchTypes.includes('artifact')) {
      searches.push((async () => {
        const { data } = await supabase.from('artifacts').select('id, name').eq('project_id', projectId).ilike('name', ilike).limit(limit)
        for (const row of data || []) {
          if (excludeType === 'artifact' && excludeId === row.id) continue
          results.push({ type: 'artifact', id: row.id, name: row.name, already_linked: linkedIds.has(`artifact:${row.id}`) })
        }
      })())
    }

    await Promise.all(searches)

    // Sort: non-linked first, then alphabetically
    results.sort((a, b) => {
      if (a.already_linked && !b.already_linked) return 1
      if (!a.already_linked && b.already_linked) return -1
      return a.name.localeCompare(b.name)
    })

    // Trim to limit
    const trimmed = results.slice(0, limit)

    return Response.json({ results: trimmed, total_count: results.length })
  } catch (err) {
    return handleAuthError(err)
  }
}
