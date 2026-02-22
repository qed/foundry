import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
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

    // Verify blueprint exists
    const { data: existing } = await supabase
      .from('blueprints')
      .select('id, blueprint_type, status')
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
