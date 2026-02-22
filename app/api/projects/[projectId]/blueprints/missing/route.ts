import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/blueprints/missing
 * Returns feature nodes that do NOT have a linked blueprint.
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

    // Get all feature-level nodes (epic, feature, sub_feature — excluding tasks)
    const { data: featureNodes, error: fnErr } = await supabase
      .from('feature_nodes')
      .select('id, title, level, parent_id')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .in('level', ['epic', 'feature', 'sub_feature'])
      .order('title', { ascending: true })

    if (fnErr) {
      console.error('Error fetching feature nodes:', fnErr)
      return Response.json({ error: 'Failed to fetch feature nodes' }, { status: 500 })
    }

    // Get all feature_node_ids that have blueprints
    const { data: blueprints, error: bpErr } = await supabase
      .from('blueprints')
      .select('feature_node_id')
      .eq('project_id', projectId)
      .not('feature_node_id', 'is', null)

    if (bpErr) {
      console.error('Error fetching blueprints:', bpErr)
      return Response.json({ error: 'Failed to fetch blueprints' }, { status: 500 })
    }

    const linkedIds = new Set((blueprints || []).map((b) => b.feature_node_id))

    const missing = (featureNodes || []).filter((n) => !linkedIds.has(n.id))

    return Response.json({
      total: missing.length,
      features: missing,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
