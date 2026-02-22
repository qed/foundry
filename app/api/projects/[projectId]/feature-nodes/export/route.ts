import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import {
  buildTreeJson,
  buildTreeMarkdown,
  buildTreeCsv,
  type ExportTreeNode,
  type FlatExportNode,
} from '@/lib/shop/export-utils'

interface DbNode {
  id: string
  title: string
  description: string | null
  level: string
  status: string
  parent_id: string | null
  position: number
}

function buildTree(rows: DbNode[]): ExportTreeNode[] {
  const nodeMap = new Map<string, ExportTreeNode>()
  const roots: ExportTreeNode[] = []

  for (const row of rows) {
    nodeMap.set(row.id, { ...row, children: [] })
  }

  for (const row of rows) {
    const node = nodeMap.get(row.id)!
    if (row.parent_id) {
      const parent = nodeMap.get(row.parent_id)
      if (parent) parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  function sortChildren(nodes: ExportTreeNode[]) {
    nodes.sort((a, b) => a.position - b.position)
    for (const node of nodes) {
      if (node.children.length > 0) sortChildren(node.children)
    }
  }
  sortChildren(roots)

  return roots
}

/**
 * POST /api/projects/[projectId]/feature-nodes/export
 * Export the feature tree as JSON, Markdown, or CSV.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json().catch(() => ({}))
    const format = body.format || 'json'
    const includeDescriptions = body.includeDescriptions !== false

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

    // Get project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    const projectName = project?.name || 'Project'
    const safeProjectName = projectName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'feature-tree'

    // Fetch all non-deleted feature nodes
    const { data: rows, error } = await supabase
      .from('feature_nodes')
      .select('id, title, description, level, status, parent_id, position')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching feature nodes:', error)
      return Response.json({ error: 'Failed to fetch feature tree' }, { status: 500 })
    }

    const dbNodes = (rows || []) as DbNode[]

    if (format === 'json') {
      const tree = buildTree(dbNodes)
      const json = buildTreeJson(tree, projectName, includeDescriptions)
      return new Response(JSON.stringify(json, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeProjectName}_tree.json"`,
        },
      })
    }

    if (format === 'markdown') {
      const tree = buildTree(dbNodes)
      const md = buildTreeMarkdown(tree, projectName)
      return new Response(md, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeProjectName}_tree.md"`,
        },
      })
    }

    if (format === 'csv') {
      const flatNodes: FlatExportNode[] = dbNodes.map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        level: n.level,
        status: n.status,
        parent_id: n.parent_id,
        position: n.position,
      }))
      const csv = buildTreeCsv(flatNodes)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeProjectName}_tree.csv"`,
        },
      })
    }

    return Response.json({ error: 'Invalid format. Use: json, markdown, csv' }, { status: 400 })
  } catch (err) {
    return handleAuthError(err)
  }
}
