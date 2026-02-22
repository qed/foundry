import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/artifacts/search
 * Full-text search across artifact filenames and extracted content.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { project_id, query, folder_id, limit = 20 } = body

    if (!project_id || !query) {
      return Response.json({ error: 'project_id and query are required' }, { status: 400 })
    }

    if (query.length < 2) {
      return Response.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    const resultLimit = Math.min(Math.max(1, limit), 100)

    const supabase = createServiceClient()

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const startTime = Date.now()

    // Use PostgreSQL full-text search via RPC or raw query
    // Since Supabase JS client doesn't expose ts_rank directly,
    // we use textSearch filter + client-side enrichment
    let searchQuery = supabase
      .from('artifacts')
      .select('id, name, file_type, file_size, content_text, folder_id, created_at, processing_status')
      .eq('project_id', project_id)
      .textSearch('search_vector', query, { type: 'websearch' })
      .limit(resultLimit)

    if (folder_id) {
      searchQuery = searchQuery.eq('folder_id', folder_id)
    }

    const { data: artifacts, error } = await searchQuery

    if (error) {
      console.error('Search error:', error)
      return Response.json({ error: 'Search failed' }, { status: 500 })
    }

    const queryTime = Date.now() - startTime

    // Enrich results with content preview and search context
    const results = (artifacts || []).map((artifact) => {
      const contentPreview = artifact.content_text
        ? artifact.content_text.slice(0, 200)
        : null

      // Find matching context around the search term
      let searchContext: string | null = null
      if (artifact.content_text) {
        const lowerContent = artifact.content_text.toLowerCase()
        const lowerQuery = query.toLowerCase()
        const idx = lowerContent.indexOf(lowerQuery)
        if (idx >= 0) {
          const start = Math.max(0, idx - 60)
          const end = Math.min(artifact.content_text.length, idx + lowerQuery.length + 60)
          searchContext = (start > 0 ? '...' : '') +
            artifact.content_text.slice(start, end) +
            (end < artifact.content_text.length ? '...' : '')
        }
      }

      return {
        id: artifact.id,
        name: artifact.name,
        file_type: artifact.file_type,
        file_size: artifact.file_size,
        folder_id: artifact.folder_id,
        content_preview: contentPreview,
        search_context: searchContext,
        processing_status: artifact.processing_status,
        created_at: artifact.created_at,
      }
    })

    return Response.json({
      artifacts: results,
      total_count: results.length,
      query_execution_time_ms: queryTime,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
