import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { FeatureStatus, FeatureLevel } from '@/types/database'

const VALID_STATUSES: FeatureStatus[] = ['not_started', 'in_progress', 'complete', 'blocked']
const VALID_LEVELS: FeatureLevel[] = ['epic', 'feature', 'sub_feature', 'task']

/**
 * GET /api/projects/[projectId]/feature-nodes/search
 * Search and filter feature nodes. Returns matching IDs + ancestor IDs for display.
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

    // Parse query params
    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')?.trim() || ''
    const statusesParam = searchParams.get('statuses') || ''
    const levelsParam = searchParams.get('levels') || ''

    const selectedStatuses = statusesParam
      ? statusesParam.split(',').filter((s): s is FeatureStatus => VALID_STATUSES.includes(s as FeatureStatus))
      : []
    const selectedLevels = levelsParam
      ? levelsParam.split(',').filter((l): l is FeatureLevel => VALID_LEVELS.includes(l as FeatureLevel))
      : []

    // Fetch all non-deleted nodes
    const { data: nodes } = await supabase
      .from('feature_nodes')
      .select('id, parent_id, title, description, level, status')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    if (!nodes || nodes.length === 0) {
      return Response.json({
        matchingNodeIds: [],
        displayNodeIds: [],
        totalMatches: 0,
        statusCounts: { not_started: 0, in_progress: 0, complete: 0, blocked: 0 },
        levelCounts: { epic: 0, feature: 0, sub_feature: 0, task: 0 },
      })
    }

    // Compute full-tree counts for filter checkboxes
    const statusCounts: Record<FeatureStatus, number> = { not_started: 0, in_progress: 0, complete: 0, blocked: 0 }
    const levelCounts: Record<FeatureLevel, number> = { epic: 0, feature: 0, sub_feature: 0, task: 0 }
    const parentMap = new Map<string, string>()

    for (const node of nodes) {
      statusCounts[node.status as FeatureStatus]++
      levelCounts[node.level as FeatureLevel]++
      if (node.parent_id) {
        parentMap.set(node.id, node.parent_id as string)
      }
    }

    // Search: case-insensitive match on title and description
    const lowerQ = q.toLowerCase()
    let matchingIds = nodes.map((n) => n.id)

    if (q) {
      matchingIds = nodes
        .filter((n) => {
          const titleMatch = n.title.toLowerCase().includes(lowerQ)
          const descMatch = n.description?.toLowerCase().includes(lowerQ) || false
          return titleMatch || descMatch
        })
        .map((n) => n.id)
    }

    // Filter by status
    if (selectedStatuses.length > 0) {
      const statusSet = new Set(selectedStatuses)
      matchingIds = matchingIds.filter((id) => {
        const node = nodes.find((n) => n.id === id)
        return node && statusSet.has(node.status as FeatureStatus)
      })
    }

    // Filter by level
    if (selectedLevels.length > 0) {
      const levelSet = new Set(selectedLevels)
      matchingIds = matchingIds.filter((id) => {
        const node = nodes.find((n) => n.id === id)
        return node && levelSet.has(node.level as FeatureLevel)
      })
    }

    // Compute display nodes: matching + all ancestors
    const displaySet = new Set(matchingIds)
    for (const id of matchingIds) {
      let currentId: string | undefined = id
      while (currentId && parentMap.has(currentId)) {
        const pid: string = parentMap.get(currentId)!
        displaySet.add(pid)
        currentId = pid
      }
    }

    return Response.json({
      matchingNodeIds: matchingIds,
      displayNodeIds: Array.from(displaySet),
      totalMatches: matchingIds.length,
      statusCounts,
      levelCounts,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
