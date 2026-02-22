import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { FeatureStatus } from '@/types/database'

const VALID_STATUSES: FeatureStatus[] = ['not_started', 'in_progress', 'complete', 'blocked']

function calculateParentStatus(childStatuses: FeatureStatus[]): FeatureStatus {
  if (childStatuses.length === 0) return 'not_started'
  if (childStatuses.every((s) => s === 'complete')) return 'complete'
  if (childStatuses.some((s) => s === 'blocked')) return 'blocked'
  if (childStatuses.some((s) => s === 'in_progress' || s === 'complete')) return 'in_progress'
  return 'not_started'
}

/**
 * PUT /api/projects/[projectId]/feature-nodes/[nodeId]/status
 * Update a node's status with automatic parent cascade.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; nodeId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, nodeId } = await params
    const { status } = await request.json()

    if (!VALID_STATUSES.includes(status)) {
      return Response.json({ error: 'Invalid status value' }, { status: 400 })
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

    // Fetch the node
    const { data: node } = await supabase
      .from('feature_nodes')
      .select('id, parent_id, status')
      .eq('id', nodeId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (!node) {
      return Response.json({ error: 'Node not found' }, { status: 404 })
    }

    const oldStatus = node.status as FeatureStatus

    // No-op check
    if (oldStatus === status) {
      return Response.json({ id: nodeId, status, updated_at: new Date().toISOString() })
    }

    // Update the node's status
    const { data: updated, error: updateErr } = await supabase
      .from('feature_nodes')
      .update({ status })
      .eq('id', nodeId)
      .select('id, status, updated_at')
      .single()

    if (updateErr) {
      return Response.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Cascade up the ancestor chain
    const cascadeResults: { nodeId: string; oldStatus: string; newStatus: string }[] = []
    let currentParentId: string | null = node.parent_id

    while (currentParentId) {
      // Fetch all children of this parent
      const { data: children } = await supabase
        .from('feature_nodes')
        .select('id, status')
        .eq('parent_id', currentParentId as string)
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (!children) break

      const childStatuses = children.map((c) => c.status as FeatureStatus)
      const newParentStatus = calculateParentStatus(childStatuses)

      // Fetch the parent to check current status and get its parent_id
      const { data: parent } = await supabase
        .from('feature_nodes')
        .select('id, parent_id, status')
        .eq('id', currentParentId as string)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .single()

      if (!parent) break

      if ((parent.status as FeatureStatus) !== newParentStatus) {
        await supabase
          .from('feature_nodes')
          .update({ status: newParentStatus })
          .eq('id', parent.id)

        cascadeResults.push({
          nodeId: parent.id,
          oldStatus: parent.status,
          newStatus: newParentStatus,
        })

        currentParentId = parent.parent_id
      } else {
        break // No change, stop cascading
      }
    }

    return Response.json({
      ...updated,
      oldStatus,
      cascadeResults,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
