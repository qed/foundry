import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/cross-doc-suggestions
 * List cross-doc suggestions with optional filters.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'proposed' | 'approved' | 'rejected' | 'applied' | null
    const blueprintId = searchParams.get('blueprintId')

    let query = supabase
      .from('cross_doc_suggestions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (blueprintId) query = query.eq('trigger_blueprint_id', blueprintId)

    const { data: suggestions, error } = await query

    if (error) {
      console.error('Error fetching cross-doc suggestions:', error)
      return Response.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
    }

    // Enrich with trigger blueprint title and item counts
    const triggerIds = [...new Set((suggestions || []).filter((s) => s.trigger_blueprint_id).map((s) => s.trigger_blueprint_id!))]
    const suggestionIds = (suggestions || []).map((s) => s.id)

    const [bpResult, itemsResult] = await Promise.all([
      triggerIds.length > 0
        ? supabase.from('blueprints').select('id, title').in('id', triggerIds)
        : Promise.resolve({ data: [] }),
      suggestionIds.length > 0
        ? supabase.from('cross_doc_suggestion_items').select('suggestion_id, blueprint_id').in('suggestion_id', suggestionIds)
        : Promise.resolve({ data: [] }),
    ])

    const bpMap = new Map((bpResult.data || []).map((bp) => [bp.id, bp.title]))

    // Count items per suggestion
    const itemCountMap = new Map<string, number>()
    for (const item of (itemsResult.data || [])) {
      itemCountMap.set(item.suggestion_id, (itemCountMap.get(item.suggestion_id) || 0) + 1)
    }

    const enriched = (suggestions || []).map((s) => ({
      ...s,
      trigger_blueprint_title: s.trigger_blueprint_id ? bpMap.get(s.trigger_blueprint_id) || null : null,
      item_count: itemCountMap.get(s.id) || 0,
    }))

    // Counts by status
    const counts = {
      proposed: (suggestions || []).filter((s) => s.status === 'proposed').length,
      approved: (suggestions || []).filter((s) => s.status === 'approved').length,
      rejected: (suggestions || []).filter((s) => s.status === 'rejected').length,
      applied: (suggestions || []).filter((s) => s.status === 'applied').length,
      total: (suggestions || []).length,
    }

    return Response.json({ suggestions: enriched, counts })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * POST /api/projects/[projectId]/cross-doc-suggestions
 * Create a new cross-doc suggestion with items.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { title, description, triggerBlueprintId, changeImpact, items } = body
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

    // Validate
    if (!title || !description) {
      return Response.json({ error: 'title and description are required' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'At least one suggestion item is required' }, { status: 400 })
    }

    // Create suggestion
    const { data: suggestion, error: sugError } = await supabase
      .from('cross_doc_suggestions')
      .insert({
        project_id: projectId,
        created_by: user.id,
        trigger_blueprint_id: triggerBlueprintId || null,
        title: title.trim(),
        description: description.trim(),
        change_impact: changeImpact?.trim() || null,
      })
      .select()
      .single()

    if (sugError || !suggestion) {
      console.error('Error creating cross-doc suggestion:', sugError)
      return Response.json({ error: 'Failed to create suggestion' }, { status: 500 })
    }

    // Create items
    const validTypes = ['edit', 'add_section', 'remove_section'] as const
    type SugType = typeof validTypes[number]
    const itemInserts = items.map((item: { blueprintId: string; suggestionType: string; targetSection?: string; currentContent?: string; proposedContent?: string; reasoning?: string }) => ({
      suggestion_id: suggestion.id,
      blueprint_id: item.blueprintId,
      suggestion_type: (validTypes.includes(item.suggestionType as SugType) ? item.suggestionType : 'edit') as SugType,
      target_section: item.targetSection || null,
      current_content: item.currentContent || null,
      proposed_content: item.proposedContent || null,
      reasoning: item.reasoning || null,
    }))

    const { error: itemsError } = await supabase
      .from('cross_doc_suggestion_items')
      .insert(itemInserts)

    if (itemsError) {
      console.error('Error creating suggestion items:', itemsError)
      // Clean up the suggestion if items fail
      await supabase.from('cross_doc_suggestions').delete().eq('id', suggestion.id)
      return Response.json({ error: 'Failed to create suggestion items' }, { status: 500 })
    }

    return Response.json({ suggestion }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
