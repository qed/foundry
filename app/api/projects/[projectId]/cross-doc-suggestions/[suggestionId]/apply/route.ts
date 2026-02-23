import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { markdownToTipTap } from '@/lib/agent/markdown-to-tiptap'
import type { Json } from '@/types/database'

/**
 * POST /api/projects/[projectId]/cross-doc-suggestions/[suggestionId]/apply
 * Apply approved suggestion items to their target blueprints.
 */
export async function POST(
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
    const { data: suggestion } = await supabase
      .from('cross_doc_suggestions')
      .select('id, status, project_id')
      .eq('id', suggestionId)
      .eq('project_id', projectId)
      .single()

    if (!suggestion) {
      return Response.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    if (suggestion.status === 'applied') {
      return Response.json({ error: 'Suggestion already applied' }, { status: 400 })
    }

    if (suggestion.status === 'rejected') {
      return Response.json({ error: 'Cannot apply rejected suggestion' }, { status: 400 })
    }

    // Get approved, unapplied items
    const { data: items } = await supabase
      .from('cross_doc_suggestion_items')
      .select('*')
      .eq('suggestion_id', suggestionId)
      .eq('is_approved', true)
      .eq('applied', false)

    if (!items || items.length === 0) {
      return Response.json({ error: 'No approved items to apply' }, { status: 400 })
    }

    let appliedCount = 0
    const errors: string[] = []

    for (const item of items) {
      try {
        if (!item.proposed_content) {
          continue
        }

        // Fetch current blueprint
        const { data: blueprint } = await supabase
          .from('blueprints')
          .select('id, content')
          .eq('id', item.blueprint_id)
          .eq('project_id', projectId)
          .single()

        if (!blueprint) {
          errors.push(`Blueprint ${item.blueprint_id} not found`)
          continue
        }

        // Convert proposed markdown content to TipTap JSON
        const newContent = markdownToTipTap(item.proposed_content)

        // Create version snapshot (fire-and-forget)
        ;(async () => {
          try {
            const { data: lastVersion } = await supabase
              .from('blueprint_versions')
              .select('version_number')
              .eq('blueprint_id', item.blueprint_id)
              .order('version_number', { ascending: false })
              .limit(1)
              .single()

            const nextVersionNumber = (lastVersion?.version_number || 0) + 1

            await supabase.from('blueprint_versions').insert({
              blueprint_id: item.blueprint_id,
              version_number: nextVersionNumber,
              content: newContent as unknown as Json,
              created_by: user.id,
              trigger_type: 'ai_generated',
              change_note: `Cross-doc suggestion: ${item.target_section || 'content update'}`,
            })
          } catch (vErr) {
            console.error('Error creating version for cross-doc apply:', vErr)
          }
        })()

        // Update blueprint content
        const { error: updateErr } = await supabase
          .from('blueprints')
          .update({ content: newContent as unknown as Json })
          .eq('id', item.blueprint_id)

        if (updateErr) {
          errors.push(`Failed to update blueprint ${item.blueprint_id}`)
          continue
        }

        // Mark item as applied
        await supabase
          .from('cross_doc_suggestion_items')
          .update({ applied: true })
          .eq('id', item.id)

        // Log activity (fire-and-forget)
        supabase.from('blueprint_activities').insert({
          blueprint_id: item.blueprint_id,
          user_id: user.id,
          action: 'content_updated' as const,
          action_details: { source: 'cross_doc_suggestion', suggestion_id: suggestionId },
        }).then()

        appliedCount++
      } catch (err) {
        console.error(`Error applying item ${item.id}:`, err)
        errors.push(`Error applying to blueprint ${item.blueprint_id}`)
      }
    }

    // Mark suggestion as applied
    await supabase
      .from('cross_doc_suggestions')
      .update({
        status: 'applied' as const,
        applied_at: new Date().toISOString(),
        applied_by: user.id,
      })
      .eq('id', suggestionId)

    return Response.json({
      applied: appliedCount,
      total: items.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
