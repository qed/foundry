import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/cross-doc-suggestions/[suggestionId]
 * Get suggestion detail with all items, enriched with blueprint titles.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; suggestionId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, suggestionId } = await params
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

    // Fetch suggestion
    const { data: suggestion, error } = await supabase
      .from('cross_doc_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('project_id', projectId)
      .single()

    if (error || !suggestion) {
      return Response.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    // Fetch items
    const { data: items } = await supabase
      .from('cross_doc_suggestion_items')
      .select('*')
      .eq('suggestion_id', suggestionId)
      .order('created_at')

    // Enrich items with blueprint titles
    const blueprintIds = [...new Set([
      ...(items || []).map((i) => i.blueprint_id),
      ...(suggestion.trigger_blueprint_id ? [suggestion.trigger_blueprint_id] : []),
    ])]

    let bpMap = new Map<string, { title: string; blueprint_type: string; status: string }>()
    if (blueprintIds.length > 0) {
      const { data: bps } = await supabase
        .from('blueprints')
        .select('id, title, blueprint_type, status')
        .in('id', blueprintIds)

      bpMap = new Map((bps || []).map((bp) => [bp.id, { title: bp.title, blueprint_type: bp.blueprint_type, status: bp.status }]))
    }

    const enrichedItems = (items || []).map((item) => ({
      ...item,
      blueprint_title: bpMap.get(item.blueprint_id)?.title || 'Unknown Blueprint',
      blueprint_type: bpMap.get(item.blueprint_id)?.blueprint_type || null,
      blueprint_status: bpMap.get(item.blueprint_id)?.status || null,
    }))

    return Response.json({
      suggestion: {
        ...suggestion,
        trigger_blueprint_title: suggestion.trigger_blueprint_id
          ? bpMap.get(suggestion.trigger_blueprint_id)?.title || null
          : null,
      },
      items: enrichedItems,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * PATCH /api/projects/[projectId]/cross-doc-suggestions/[suggestionId]
 * Update suggestion status or individual item approval.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; suggestionId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, suggestionId } = await params
    const body = await request.json()
    const { status, itemUpdates } = body
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

    // Verify suggestion exists
    const { data: existing } = await supabase
      .from('cross_doc_suggestions')
      .select('id, status')
      .eq('id', suggestionId)
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      return Response.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    // Update individual item approval states
    if (itemUpdates && Array.isArray(itemUpdates)) {
      for (const update of itemUpdates) {
        if (update.id && typeof update.is_approved === 'boolean') {
          await supabase
            .from('cross_doc_suggestion_items')
            .update({ is_approved: update.is_approved })
            .eq('id', update.id)
            .eq('suggestion_id', suggestionId)
        }
      }
    }

    // Update suggestion status
    if (status) {
      const validStatuses = ['proposed', 'approved', 'rejected', 'applied']
      if (!validStatuses.includes(status)) {
        return Response.json({ error: 'Invalid status' }, { status: 400 })
      }

      const updates: Record<string, unknown> = { status }

      if (status === 'applied') {
        updates.applied_at = new Date().toISOString()
        updates.applied_by = user.id
      }

      const { error: updateErr } = await supabase
        .from('cross_doc_suggestions')
        .update(updates)
        .eq('id', suggestionId)

      if (updateErr) {
        console.error('Error updating suggestion:', updateErr)
        return Response.json({ error: 'Failed to update' }, { status: 500 })
      }
    }

    return Response.json({ updated: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
