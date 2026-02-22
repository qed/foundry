import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/blueprints/filters
 * Returns available filter options for blueprints: statuses, authors, feature nodes.
 */
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
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch distinct authors who have created blueprints in this project
    const { data: authorBlueprints } = await supabase
      .from('blueprints')
      .select('created_by')
      .eq('project_id', projectId)

    const authorIds = [...new Set((authorBlueprints || []).map((b) => b.created_by).filter(Boolean))]

    let authors: { id: string; display_name: string; avatar_url: string | null }[] = []
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', authorIds)
      authors = (profiles || []).map((p) => ({
        id: p.id,
        display_name: p.display_name || 'Unknown',
        avatar_url: p.avatar_url,
      }))
    }

    // Fetch feature nodes that have blueprints
    const { data: featureBlueprints } = await supabase
      .from('blueprints')
      .select('feature_node_id')
      .eq('project_id', projectId)
      .eq('blueprint_type', 'feature')
      .not('feature_node_id', 'is', null)

    const featureNodeIds = [...new Set((featureBlueprints || []).map((b) => b.feature_node_id).filter(Boolean))]

    let features: { id: string; title: string }[] = []
    if (featureNodeIds.length > 0) {
      const { data: nodes } = await supabase
        .from('feature_nodes')
        .select('id, title')
        .in('id', featureNodeIds as string[])
        .order('title')
      features = nodes || []
    }

    return Response.json({
      statuses: ['draft', 'in_review', 'approved', 'implemented'],
      authors,
      features,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
