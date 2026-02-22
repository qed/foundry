import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { FeatureLevel } from '@/types/database'

const VALID_LEVELS: FeatureLevel[] = ['epic', 'feature', 'sub_feature', 'task']
const LEVEL_ORDER: Record<FeatureLevel, number> = { epic: 0, feature: 1, sub_feature: 2, task: 3 }

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; nodeId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, nodeId } = await params
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

    // Fetch current node
    const { data: existing } = await supabase
      .from('feature_nodes')
      .select('*')
      .eq('id', nodeId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (!existing) {
      return Response.json(
        { error: 'Feature node not found' },
        { status: 404 }
      )
    }

    // Build update object from allowed fields
    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) {
      const title = (body.title || '').trim()
      if (title.length > 255) {
        return Response.json({ error: 'Title must not exceed 255 characters' }, { status: 400 })
      }
      updates.title = title
    }
    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null
    }

    // Handle level change
    if (body.level !== undefined && body.level !== existing.level) {
      const newLevel = body.level as FeatureLevel
      if (!VALID_LEVELS.includes(newLevel)) {
        return Response.json({ error: 'Invalid level' }, { status: 400 })
      }

      const currentOrder = LEVEL_ORDER[existing.level as FeatureLevel]
      const newOrder = LEVEL_ORDER[newLevel]

      // Only allow single-step changes
      if (Math.abs(newOrder - currentOrder) > 1) {
        return Response.json(
          { error: 'Level can only change by one step at a time' },
          { status: 400 }
        )
      }

      // If demoting to task, ensure node has no children
      if (newLevel === 'task') {
        const { count } = await supabase
          .from('feature_nodes')
          .select('id', { count: 'exact', head: true })
          .eq('parent_id', nodeId)
          .is('deleted_at', null)

        if (count && count > 0) {
          return Response.json(
            { error: 'Cannot change to task: node has children. Remove children first.' },
            { status: 400 }
          )
        }
      }

      updates.level = newLevel

      // Auto-adjust children levels proportionally
      const levelDelta = newOrder - currentOrder // positive = demoting, negative = promoting
      if (levelDelta !== 0) {
        await adjustChildrenLevels(supabase, nodeId, projectId, levelDelta)
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('feature_nodes')
      .update(updates)
      .eq('id', nodeId)
      .select()
      .single()

    if (updateErr) {
      console.error('Error updating feature node:', updateErr)
      return Response.json(
        { error: 'Failed to update feature node' },
        { status: 500 }
      )
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; nodeId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, nodeId } = await params
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

    // Fetch node to get parent_id
    const { data: node } = await supabase
      .from('feature_nodes')
      .select('id, parent_id')
      .eq('id', nodeId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (!node) {
      return Response.json({ error: 'Feature node not found' }, { status: 404 })
    }

    // Parse delete option from body or query
    let deleteOption = 'delete_only'
    try {
      const body = await request.json()
      if (body.deleteOption) deleteOption = body.deleteOption
    } catch {
      // No body — use default
    }

    const now = new Date().toISOString()
    let childrenDeleted = 0
    let childrenReparented = 0

    if (deleteOption === 'delete_subtree') {
      // Recursively soft-delete all descendants
      childrenDeleted = await softDeleteSubtree(supabase, nodeId, projectId, now)
    } else if (deleteOption === 'reparent_children') {
      // Count children first
      const { count: childCount } = await supabase
        .from('feature_nodes')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', nodeId)
        .eq('project_id', projectId)
        .is('deleted_at', null)

      // Move children up to this node's parent
      await supabase
        .from('feature_nodes')
        .update({ parent_id: node.parent_id })
        .eq('parent_id', nodeId)
        .eq('project_id', projectId)
        .is('deleted_at', null)

      childrenReparented = childCount || 0
    }
    // delete_only: just soft-delete the node itself (children become orphaned at root)

    // Soft-delete the node
    const { error: deleteErr } = await supabase
      .from('feature_nodes')
      .update({ deleted_at: now })
      .eq('id', nodeId)
      .eq('project_id', projectId)

    if (deleteErr) {
      console.error('Error deleting feature node:', deleteErr)
      return Response.json(
        { error: 'Failed to delete feature node' },
        { status: 500 }
      )
    }

    return Response.json({
      id: nodeId,
      deleted_at: now,
      childrenDeleted,
      childrenReparented,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

// Recursively soft-delete all descendants
async function softDeleteSubtree(
  supabase: ReturnType<typeof createServiceClient>,
  parentId: string,
  projectId: string,
  now: string
): Promise<number> {
  const { data: children } = await supabase
    .from('feature_nodes')
    .select('id')
    .eq('parent_id', parentId)
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (!children || children.length === 0) return 0

  let count = 0
  for (const child of children) {
    count += await softDeleteSubtree(supabase, child.id, projectId, now)
  }

  // Soft-delete all direct children
  await supabase
    .from('feature_nodes')
    .update({ deleted_at: now })
    .eq('parent_id', parentId)
    .eq('project_id', projectId)
    .is('deleted_at', null)

  return count + children.length
}

// Recursively adjust children levels by delta
async function adjustChildrenLevels(
  supabase: ReturnType<typeof createServiceClient>,
  parentId: string,
  projectId: string,
  delta: number
): Promise<void> {
  const { data: children } = await supabase
    .from('feature_nodes')
    .select('id, level')
    .eq('parent_id', parentId)
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (!children || children.length === 0) return

  for (const child of children) {
    const currentOrder = LEVEL_ORDER[child.level as FeatureLevel]
    const newOrder = Math.max(0, Math.min(3, currentOrder + delta))
    const newLevel = VALID_LEVELS[newOrder]

    if (newLevel !== child.level) {
      await supabase
        .from('feature_nodes')
        .update({ level: newLevel })
        .eq('id', child.id)

      // Recursively adjust grandchildren
      await adjustChildrenLevels(supabase, child.id, projectId, delta)
    }
  }
}
