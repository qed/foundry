import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

interface TreeNode {
  id: string
  project_id: string
  parent_id: string | null
  title: string
  description: string | null
  level: 'epic' | 'feature' | 'sub_feature' | 'task'
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked'
  position: number
  hall_idea_id: string | null
  created_at: string
  updated_at: string
  children: TreeNode[]
}

function buildTree(
  rows: Omit<TreeNode, 'children'>[]
): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  // Create all nodes with empty children
  for (const row of rows) {
    nodeMap.set(row.id, { ...row, children: [] })
  }

  // Assign children to parents
  for (const row of rows) {
    const node = nodeMap.get(row.id)!
    if (row.parent_id) {
      const parent = nodeMap.get(row.parent_id)
      if (parent) {
        parent.children.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  // Sort children by position recursively
  function sortChildren(nodes: TreeNode[]) {
    nodes.sort((a, b) => a.position - b.position)
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortChildren(node.children)
      }
    }
  }
  sortChildren(roots)

  return roots
}

export async function GET(
  _request: NextRequest,
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
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    // Fetch all non-deleted feature nodes for this project
    const { data: rows, error } = await supabase
      .from('feature_nodes')
      .select('id, project_id, parent_id, title, description, level, status, position, hall_idea_id, created_at, updated_at')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching feature nodes:', error)
      return Response.json(
        { error: 'Failed to fetch feature tree' },
        { status: 500 }
      )
    }

    const nodes = buildTree(rows || [])

    return Response.json({ nodes, count: rows?.length || 0 })
  } catch (err) {
    return handleAuthError(err)
  }
}
