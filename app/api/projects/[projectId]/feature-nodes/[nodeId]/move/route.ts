import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { FeatureLevel } from '@/types/database'

/**
 * Valid parent levels for each node level.
 * epic: only root (null parent)
 * feature: under epic
 * sub_feature: under feature or epic
 * task: under sub_feature or feature
 */
const VALID_PARENT_LEVELS: Record<FeatureLevel, (FeatureLevel | null)[]> = {
  epic: [null],
  feature: ['epic'],
  sub_feature: ['epic', 'feature'],
  task: ['feature', 'sub_feature'],
}

/**
 * PUT /api/projects/[projectId]/feature-nodes/[nodeId]/move
 * Move a feature node to a new parent and/or position.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; nodeId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, nodeId } = await params
    const { parentId, position } = await request.json()

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

    // Fetch the node being moved
    const { data: node } = await supabase
      .from('feature_nodes')
      .select('id, parent_id, level, position')
      .eq('id', nodeId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (!node) {
      return Response.json({ error: 'Node not found' }, { status: 404 })
    }

    const newParentId: string | null = parentId ?? null
    const newPosition: number = typeof position === 'number' ? position : 0

    // Cannot move to self
    if (newParentId === nodeId) {
      return Response.json({ error: 'Cannot move node into itself' }, { status: 400 })
    }

    // Validate parent exists and get its level
    let parentLevel: FeatureLevel | null = null
    if (newParentId) {
      const { data: parent } = await supabase
        .from('feature_nodes')
        .select('id, level')
        .eq('id', newParentId)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .single()

      if (!parent) {
        return Response.json({ error: 'Target parent not found' }, { status: 404 })
      }
      parentLevel = parent.level as FeatureLevel
    }

    // Validate level constraint
    const nodeLevel = node.level as FeatureLevel
    const validParents = VALID_PARENT_LEVELS[nodeLevel]
    if (!validParents.includes(parentLevel)) {
      return Response.json(
        { error: `Cannot place ${nodeLevel} under ${parentLevel || 'root'}` },
        { status: 400 }
      )
    }

    // Check circular reference — ensure newParentId is not a descendant of nodeId
    if (newParentId) {
      const isCircular = await checkIsDescendant(supabase, nodeId, newParentId, projectId)
      if (isCircular) {
        return Response.json({ error: 'Cannot move node into its own subtree' }, { status: 400 })
      }
    }

    // No-op check
    if (node.parent_id === newParentId && node.position === newPosition) {
      return Response.json({ id: nodeId, parentId: newParentId, position: newPosition })
    }

    // Move the node: update parent_id and position
    const { error: moveErr } = await supabase
      .from('feature_nodes')
      .update({ parent_id: newParentId, position: newPosition })
      .eq('id', nodeId)

    if (moveErr) {
      return Response.json({ error: 'Failed to move node' }, { status: 500 })
    }

    // Renumber siblings at the destination to ensure clean sequential positions
    await renumberSiblings(supabase, projectId, newParentId, nodeId, newPosition)

    // If the old parent differs, also renumber old siblings
    if (node.parent_id !== newParentId) {
      await renumberSiblings(supabase, projectId, node.parent_id, null, -1)
    }

    return Response.json({ id: nodeId, parentId: newParentId, position: newPosition })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * Check if targetId is a descendant of ancestorId.
 */
async function checkIsDescendant(
  supabase: ReturnType<typeof createServiceClient>,
  ancestorId: string,
  targetId: string,
  projectId: string
): Promise<boolean> {
  let currentId = targetId as string | null
  while (currentId) {
    if (currentId === ancestorId) return true
    const { data: row } = await supabase
      .from('feature_nodes')
      .select('parent_id')
      .eq('id', currentId as string)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()
    if (!row) break
    currentId = row.parent_id as string | null
  }
  return false
}

/**
 * Renumber all siblings under a parent to ensure clean sequential positions.
 * If movedNodeId is provided, it's placed at targetPosition.
 */
async function renumberSiblings(
  supabase: ReturnType<typeof createServiceClient>,
  projectId: string,
  parentId: string | null,
  movedNodeId: string | null,
  targetPosition: number
) {
  // Fetch all siblings
  let query = supabase
    .from('feature_nodes')
    .select('id, position')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('position', { ascending: true })

  if (parentId) {
    query = query.eq('parent_id', parentId)
  } else {
    query = query.is('parent_id', null)
  }

  const { data: siblings } = await query
  if (!siblings || siblings.length <= 1) return

  // Build ordered list: moved node at target position, others in order
  const others = siblings.filter((s) => s.id !== movedNodeId)
  const moved = siblings.find((s) => s.id === movedNodeId)

  let ordered: { id: string }[]
  if (moved && targetPosition >= 0) {
    ordered = [...others]
    const insertAt = Math.min(targetPosition, ordered.length)
    ordered.splice(insertAt, 0, moved)
  } else {
    ordered = siblings
  }

  // Update positions sequentially
  for (let i = 0; i < ordered.length; i++) {
    if (siblings.find((s) => s.id === ordered[i].id)?.position !== i) {
      await supabase
        .from('feature_nodes')
        .update({ position: i })
        .eq('id', ordered[i].id)
    }
  }
}
