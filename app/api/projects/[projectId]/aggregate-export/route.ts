import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import {
  buildAggregateMarkdown,
  buildAggregateHtml,
  type ExportTreeNode,
  type ExportDoc,
  type AggregateExportInput,
} from '@/lib/shop/export-utils'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

function buildTree(
  rows: { id: string; title: string; description: string | null; level: string; status: string; parent_id: string | null; position: number }[]
): ExportTreeNode[] {
  const childrenMap = new Map<string | null, typeof rows>()
  for (const row of rows) {
    const siblings = childrenMap.get(row.parent_id) || []
    siblings.push(row)
    childrenMap.set(row.parent_id, siblings)
  }

  function walk(parentId: string | null): ExportTreeNode[] {
    const children = childrenMap.get(parentId) || []
    children.sort((a, b) => a.position - b.position)
    return children.map((row) => ({
      ...row,
      children: walk(row.id),
    }))
  }

  return walk(null)
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '-')
}

/**
 * POST /api/projects/[projectId]/aggregate-export
 * Export entire project as a consolidated document.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const format = body.format === 'html' ? 'html' : 'markdown'

    const supabase = createServiceClient()

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch project + org
    const { data: project } = await supabase
      .from('projects')
      .select('name, description, org_id')
      .eq('id', projectId)
      .single()

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', project.org_id)
      .single()

    // Fetch feature tree
    const { data: nodes } = await supabase
      .from('feature_nodes')
      .select('id, title, description, level, status, parent_id, position')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('position', { ascending: true })

    const treeNodes = buildTree(nodes || [])

    // Compute stats
    const allNodes = nodes || []
    const stats = {
      epics: allNodes.filter((n) => n.level === 'epic').length,
      features: allNodes.filter((n) => n.level === 'feature').length,
      subFeatures: allNodes.filter((n) => n.level === 'sub_feature').length,
      tasks: allNodes.filter((n) => n.level === 'task').length,
    }

    // Fetch product overview
    const { data: overviewDoc } = await supabase
      .from('requirements_documents')
      .select('title, content, doc_type, feature_node_id')
      .eq('project_id', projectId)
      .eq('doc_type', 'product_overview')
      .limit(1)
      .single()

    const overview: ExportDoc | null = overviewDoc
      ? { title: overviewDoc.title, content: overviewDoc.content, doc_type: overviewDoc.doc_type, feature_node_id: overviewDoc.feature_node_id }
      : null

    // Fetch all requirements documents (FRDs + technical)
    const { data: allDocs } = await supabase
      .from('requirements_documents')
      .select('title, content, doc_type, feature_node_id')
      .eq('project_id', projectId)
      .neq('doc_type', 'product_overview')
      .order('created_at', { ascending: true })

    const docs: ExportDoc[] = (allDocs || []).map((d) => ({
      title: d.title,
      content: d.content,
      doc_type: d.doc_type,
      feature_node_id: d.feature_node_id,
    }))

    const input: AggregateExportInput = {
      projectName: project.name,
      projectDescription: project.description,
      orgName: org?.name || 'Unknown',
      stats,
      overview,
      treeNodes,
      docs,
      includeDrafts: body.includeDrafts !== false,
    }

    const date = new Date().toISOString().slice(0, 10)
    const safeName = safeFilename(project.name)

    if (format === 'html') {
      const html = buildAggregateHtml(input)
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeName}-${date}.html"`,
        },
      })
    }

    // Markdown
    const markdown = buildAggregateMarkdown(input)
    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}-${date}.md"`,
      },
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
