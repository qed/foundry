import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/blueprints/for-feature/[featureNodeId]
 * Look up the blueprint linked to a specific feature node.
 * Returns the blueprint if exists, or 404 if not.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; featureNodeId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, featureNodeId } = await params
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

    const { data: blueprint, error } = await supabase
      .from('blueprints')
      .select('*')
      .eq('project_id', projectId)
      .eq('feature_node_id', featureNodeId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching blueprint for feature:', error)
      return Response.json({ error: 'Failed to fetch blueprint' }, { status: 500 })
    }

    if (!blueprint) {
      return Response.json({ error: 'No blueprint for this feature' }, { status: 404 })
    }

    return Response.json({ blueprint })
  } catch (err) {
    return handleAuthError(err)
  }
}
