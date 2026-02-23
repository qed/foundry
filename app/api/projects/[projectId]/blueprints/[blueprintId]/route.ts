import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import {
  calculateBlueprintChangeSize,
  generateBlueprintChangeSummary,
  BLUEPRINT_VERSION_THRESHOLD,
  VERSION_DEBOUNCE_SECONDS,
} from '@/lib/blueprints/version-utils'
import type { BlueprintStatus, Json } from '@/types/database'

const VALID_STATUSES: BlueprintStatus[] = ['draft', 'in_review', 'approved', 'implemented']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; blueprintId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, blueprintId } = await params
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    const { data: blueprint, error } = await supabase
      .from('blueprints')
      .select('*')
      .eq('id', blueprintId)
      .eq('project_id', projectId)
      .single()

    if (error || !blueprint) {
      return Response.json(
        { error: 'Blueprint not found' },
        { status: 404 }
      )
    }

    return Response.json(blueprint)
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; blueprintId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, blueprintId } = await params
    const body = await request.json()
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    // Verify blueprint exists (include content for versioning comparison)
    const { data: existing } = await supabase
      .from('blueprints')
      .select('id, blueprint_type, status, content')
      .eq('id', blueprintId)
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      return Response.json(
        { error: 'Blueprint not found' },
        { status: 404 }
      )
    }

    const updates: Record<string, unknown> = {}

    // Only allow title update for non-feature blueprints (feature titles sync from feature node)
    if (body.title !== undefined && existing.blueprint_type !== 'feature') {
      const title = (body.title || '').trim()
      if (title.length > 255) {
        return Response.json({ error: 'Title must not exceed 255 characters' }, { status: 400 })
      }
      updates.title = title
    }

    if (body.content !== undefined) {
      // Content is JSONB — validate it's an object
      if (body.content !== null && typeof body.content !== 'object') {
        return Response.json({ error: 'Content must be a JSON object' }, { status: 400 })
      }
      // Size check: stringify and check length
      const contentStr = JSON.stringify(body.content)
      if (contentStr.length > 500000) {
        return Response.json({ error: 'Content too large' }, { status: 400 })
      }
      updates.content = body.content as Json
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return Response.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('blueprints')
      .update(updates)
      .eq('id', blueprintId)
      .select('id, updated_at, status')
      .single()

    if (updateErr) {
      console.error('Error updating blueprint:', updateErr)
      return Response.json(
        { error: 'Failed to update blueprint' },
        { status: 500 }
      )
    }

    // Log activities (fire-and-forget)
    if (updates.status && updates.status !== existing.status) {
      const details = { from_status: String(existing.status), to_status: String(updates.status) }
      supabase.from('blueprint_activities').insert({
        blueprint_id: blueprintId,
        user_id: user.id,
        action: 'status_changed' as const,
        action_details: details,
      }).then()
    }
    if (updates.content !== undefined) {
      supabase.from('blueprint_activities').insert({
        blueprint_id: blueprintId,
        user_id: user.id,
        action: 'content_updated' as const,
        action_details: {},
      }).then()
    }

    // Sync alert detection: notify work orders extracted from this blueprint
    if (updates.content !== undefined) {
      ;(async () => {
        try {
          // Find active work orders linked to this blueprint
          const { data: linkedWOs } = await supabase
            .from('work_orders')
            .select('id, project_id, status')
            .eq('source_blueprint_id', blueprintId)
            .neq('status', 'done')

          if (linkedWOs && linkedWOs.length > 0) {
            const changeSize = calculateBlueprintChangeSize(existing.content, updates.content)
            // Only alert if change is significant (>5% threshold)
            if (changeSize >= 5) {
              const changeSummary = generateBlueprintChangeSummary(existing.content, updates.content)
              const alertInserts = linkedWOs.map((wo) => ({
                project_id: wo.project_id,
                work_order_id: wo.id,
                blueprint_id: blueprintId,
                change_type: 'content_changed' as const,
                change_summary: changeSummary || 'Blueprint content was updated',
              }))

              await supabase.from('wo_sync_alerts').insert(alertInserts)
            }
          }
        } catch (syncErr) {
          console.error('Error creating sync alerts:', syncErr)
        }
      })()
    }

    // Auto-versioning on content change
    if (updates.content !== undefined) {
      // Fire-and-forget: create version if change is significant and enough time has passed
      ;(async () => {
        try {
          const changeSize = calculateBlueprintChangeSize(existing.content, updates.content)
          if (changeSize < BLUEPRINT_VERSION_THRESHOLD) return

          // Check debounce: was last version created within the last 2 minutes?
          const { data: lastVersion } = await supabase
            .from('blueprint_versions')
            .select('created_at, version_number')
            .eq('blueprint_id', blueprintId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single()

          if (lastVersion) {
            const elapsed = (Date.now() - new Date(lastVersion.created_at).getTime()) / 1000
            if (elapsed < VERSION_DEBOUNCE_SECONDS) return
          }

          const nextVersionNumber = (lastVersion?.version_number || 0) + 1
          const changeSummary = generateBlueprintChangeSummary(existing.content, updates.content)

          await supabase.from('blueprint_versions').insert({
            blueprint_id: blueprintId,
            version_number: nextVersionNumber,
            content: updates.content as Json,
            created_by: user.id,
            trigger_type: 'edit',
            change_note: changeSummary,
          })
        } catch (vErr) {
          console.error('Error creating auto-version:', vErr)
        }
      })()
    }

    // Auto-versioning on status change
    if (updates.status && updates.status !== existing.status) {
      ;(async () => {
        try {
          const { data: lastVersion } = await supabase
            .from('blueprint_versions')
            .select('version_number')
            .eq('blueprint_id', blueprintId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single()

          const nextVersionNumber = (lastVersion?.version_number || 0) + 1

          await supabase.from('blueprint_versions').insert({
            blueprint_id: blueprintId,
            version_number: nextVersionNumber,
            content: (updates.content || existing.content) as Json,
            created_by: user.id,
            trigger_type: 'status_change',
            change_note: `Status changed to ${updates.status}`,
          })
        } catch (vErr) {
          console.error('Error creating status version:', vErr)
        }
      })()
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * DELETE /api/projects/[projectId]/blueprints/[blueprintId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; blueprintId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, blueprintId } = await params
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

    const { error } = await supabase
      .from('blueprints')
      .delete()
      .eq('id', blueprintId)
      .eq('project_id', projectId)

    if (error) {
      console.error('Error deleting blueprint:', error)
      return Response.json({ error: 'Failed to delete blueprint' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
