import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { GraphEntityType } from '@/types/database'

interface GlobalSearchResult {
  type: GraphEntityType
  id: string
  name: string
  excerpt: string
  status?: string
  secondary?: string
}

interface GroupedResults {
  type: GraphEntityType
  label: string
  results: GlobalSearchResult[]
  total: number
}

const TYPE_LABELS: Record<GraphEntityType, string> = {
  idea: 'Ideas',
  feature: 'Features',
  blueprint: 'Blueprints',
  work_order: 'Work Orders',
  feedback: 'Feedback',
  artifact: 'Artifacts',
}

const PER_TYPE_LIMIT = 8

function buildExcerpt(text: string | null, query: string, maxLen = 120): string {
  if (!text) return ''
  const lower = text.toLowerCase()
  const qLower = query.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) return text.substring(0, maxLen) + (text.length > maxLen ? '...' : '')
  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, idx + query.length + 80)
  let excerpt = text.substring(start, end)
  if (start > 0) excerpt = '...' + excerpt
  if (end < text.length) excerpt = excerpt + '...'
  return excerpt
}

/**
 * GET /api/projects/[projectId]/search
 * Global search across all entity types.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() || ''

    if (query.length < 1) {
      return Response.json({ groups: [], query: '' })
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

    const ilike = `%${query}%`
    const groups: GroupedResults[] = []

    // Search all entity types in parallel
    const [ideas, features, blueprints, workOrders, feedback, artifacts] = await Promise.all([
      // Ideas: search title + body
      supabase
        .from('ideas')
        .select('id, title, body, status')
        .eq('project_id', projectId)
        .or(`title.ilike.${ilike},body.ilike.${ilike}`)
        .order('updated_at', { ascending: false })
        .limit(PER_TYPE_LIMIT),

      // Features: search title + description
      supabase
        .from('feature_nodes')
        .select('id, title, description, status, level')
        .eq('project_id', projectId)
        .or(`title.ilike.${ilike},description.ilike.${ilike}`)
        .order('updated_at', { ascending: false })
        .limit(PER_TYPE_LIMIT),

      // Blueprints: search title
      supabase
        .from('blueprints')
        .select('id, title, status, blueprint_type')
        .eq('project_id', projectId)
        .ilike('title', ilike)
        .order('updated_at', { ascending: false })
        .limit(PER_TYPE_LIMIT),

      // Work orders: search title + description
      supabase
        .from('work_orders')
        .select('id, title, description, status, priority')
        .eq('project_id', projectId)
        .or(`title.ilike.${ilike},description.ilike.${ilike}`)
        .order('updated_at', { ascending: false })
        .limit(PER_TYPE_LIMIT),

      // Feedback: search content
      supabase
        .from('feedback_submissions')
        .select('id, content, status, category')
        .eq('project_id', projectId)
        .ilike('content', ilike)
        .order('created_at', { ascending: false })
        .limit(PER_TYPE_LIMIT),

      // Artifacts: search name
      supabase
        .from('artifacts')
        .select('id, name, file_type')
        .eq('project_id', projectId)
        .ilike('name', ilike)
        .order('updated_at', { ascending: false })
        .limit(PER_TYPE_LIMIT),
    ])

    // Process ideas
    if (ideas.data && ideas.data.length > 0) {
      groups.push({
        type: 'idea',
        label: TYPE_LABELS.idea,
        total: ideas.data.length,
        results: ideas.data.map((r) => ({
          type: 'idea' as GraphEntityType,
          id: r.id,
          name: r.title,
          excerpt: buildExcerpt(r.body, query),
          status: r.status ?? undefined,
        })),
      })
    }

    // Process features
    if (features.data && features.data.length > 0) {
      groups.push({
        type: 'feature',
        label: TYPE_LABELS.feature,
        total: features.data.length,
        results: features.data.map((r) => ({
          type: 'feature' as GraphEntityType,
          id: r.id,
          name: r.title,
          excerpt: buildExcerpt(r.description, query),
          status: r.status ?? undefined,
          secondary: r.level ?? undefined,
        })),
      })
    }

    // Process blueprints
    if (blueprints.data && blueprints.data.length > 0) {
      groups.push({
        type: 'blueprint',
        label: TYPE_LABELS.blueprint,
        total: blueprints.data.length,
        results: blueprints.data.map((r) => ({
          type: 'blueprint' as GraphEntityType,
          id: r.id,
          name: r.title,
          excerpt: '',
          status: r.status ?? undefined,
          secondary: r.blueprint_type ?? undefined,
        })),
      })
    }

    // Process work orders
    if (workOrders.data && workOrders.data.length > 0) {
      groups.push({
        type: 'work_order',
        label: TYPE_LABELS.work_order,
        total: workOrders.data.length,
        results: workOrders.data.map((r) => ({
          type: 'work_order' as GraphEntityType,
          id: r.id,
          name: r.title,
          excerpt: buildExcerpt(r.description, query),
          status: r.status ?? undefined,
          secondary: r.priority ?? undefined,
        })),
      })
    }

    // Process feedback
    if (feedback.data && feedback.data.length > 0) {
      groups.push({
        type: 'feedback',
        label: TYPE_LABELS.feedback,
        total: feedback.data.length,
        results: feedback.data.map((r) => {
          const firstLine = r.content?.split('\n')[0] || ''
          const name = firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine || 'Untitled'
          return {
            type: 'feedback' as GraphEntityType,
            id: r.id,
            name,
            excerpt: buildExcerpt(r.content, query),
            status: r.status ?? undefined,
            secondary: r.category ?? undefined,
          }
        }),
      })
    }

    // Process artifacts
    if (artifacts.data && artifacts.data.length > 0) {
      groups.push({
        type: 'artifact',
        label: TYPE_LABELS.artifact,
        total: artifacts.data.length,
        results: artifacts.data.map((r) => ({
          type: 'artifact' as GraphEntityType,
          id: r.id,
          name: r.name,
          excerpt: '',
          secondary: r.file_type ?? undefined,
        })),
      })
    }

    return Response.json({ groups, query })
  } catch (err) {
    return handleAuthError(err)
  }
}
