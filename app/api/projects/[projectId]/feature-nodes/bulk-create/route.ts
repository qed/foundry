import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { FeatureLevel } from '@/types/database'

const VALID_LEVELS: FeatureLevel[] = ['epic', 'feature', 'sub_feature', 'task']

interface BulkNodeInput {
  tempId: string
  parentTempId: string | null
  title: string
  description: string | null
  level: FeatureLevel
}

/**
 * POST /api/projects/[projectId]/feature-nodes/bulk-create
 * Batch insert multiple feature nodes (from agent tree generation).
 * Nodes reference each other via tempId/parentTempId; real UUIDs are assigned on insert.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { nodes } = (await request.json()) as { nodes: BulkNodeInput[] }

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return Response.json({ error: 'nodes array is required and must not be empty' }, { status: 400 })
    }

    if (nodes.length > 200) {
      return Response.json({ error: 'Maximum 200 nodes per batch' }, { status: 400 })
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
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Validate all nodes
    for (const node of nodes) {
      if (!node.tempId || !node.title?.trim()) {
        return Response.json({ error: 'Each node must have tempId and title' }, { status: 400 })
      }
      if (!VALID_LEVELS.includes(node.level)) {
        return Response.json({ error: `Invalid level: ${node.level}` }, { status: 400 })
      }
    }

    // Build a set of tempIds for parent validation
    const tempIdSet = new Set(nodes.map((n) => n.tempId))
    for (const node of nodes) {
      if (node.parentTempId && !tempIdSet.has(node.parentTempId)) {
        return Response.json(
          { error: `Parent tempId "${node.parentTempId}" not found in batch` },
          { status: 400 }
        )
      }
    }

    // Get the current max position for root nodes in this project
    const { data: existingRoots } = await supabase
      .from('feature_nodes')
      .select('position')
      .eq('project_id', projectId)
      .is('parent_id', null)
      .is('deleted_at', null)
      .order('position', { ascending: false })
      .limit(1)

    const rootPositionOffset = existingRoots && existingRoots.length > 0
      ? existingRoots[0].position + 1
      : 0

    // Topological sort: insert parents before children
    // Group by parentTempId to calculate positions
    const childrenMap = new Map<string | null, BulkNodeInput[]>()
    for (const node of nodes) {
      const key = node.parentTempId
      const list = childrenMap.get(key) || []
      list.push(node)
      childrenMap.set(key, list)
    }

    // Map tempId -> real UUID after insertion
    const tempToReal = new Map<string, string>()
    const insertedIds: string[] = []

    // BFS from roots
    const queue: (string | null)[] = [null]
    const positionCounters = new Map<string | null, number>()

    // Initialize root position counter with offset
    positionCounters.set(null, rootPositionOffset)

    while (queue.length > 0) {
      const parentTempId = queue.shift()!
      const children = childrenMap.get(parentTempId) || []

      for (const node of children) {
        const realParentId = parentTempId ? (tempToReal.get(parentTempId) || null) : null

        // Calculate position among siblings
        const posKey = parentTempId
        const position = positionCounters.get(posKey) ?? 0
        positionCounters.set(posKey, position + 1)

        const { data: inserted, error: insertErr } = await supabase
          .from('feature_nodes')
          .insert({
            project_id: projectId,
            parent_id: realParentId,
            title: node.title.trim(),
            description: node.description?.trim() || null,
            level: node.level,
            status: 'not_started' as const,
            position,
            created_by: user.id,
          })
          .select('id')
          .single()

        if (insertErr || !inserted) {
          console.error('[bulk-create] Insert error:', insertErr)
          return Response.json(
            {
              error: 'Failed to insert node',
              detail: node.title,
              created: insertedIds.length,
            },
            { status: 500 }
          )
        }

        tempToReal.set(node.tempId, inserted.id)
        insertedIds.push(inserted.id)

        // If this node has children in the batch, add to queue
        if (childrenMap.has(node.tempId)) {
          queue.push(node.tempId)
          positionCounters.set(node.tempId, 0)
        }
      }
    }

    return Response.json(
      {
        created: insertedIds.length,
        nodeIds: insertedIds,
      },
      { status: 201 }
    )
  } catch (err) {
    return handleAuthError(err)
  }
}
