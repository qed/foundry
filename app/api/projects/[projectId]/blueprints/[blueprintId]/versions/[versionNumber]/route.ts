import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/blueprints/[blueprintId]/versions/[versionNumber]
 * Get a specific blueprint version with full content.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; blueprintId: string; versionNumber: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, blueprintId, versionNumber: versionStr } = await params
    const supabase = createServiceClient()

    const versionNumber = parseInt(versionStr, 10)
    if (isNaN(versionNumber) || versionNumber < 1) {
      return Response.json({ error: 'Invalid version number' }, { status: 400 })
    }

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

    // Verify blueprint exists in project
    const { data: blueprint } = await supabase
      .from('blueprints')
      .select('id')
      .eq('id', blueprintId)
      .eq('project_id', projectId)
      .single()

    if (!blueprint) {
      return Response.json({ error: 'Blueprint not found' }, { status: 404 })
    }

    // Get the specific version
    const { data: version, error } = await supabase
      .from('blueprint_versions')
      .select('*')
      .eq('blueprint_id', blueprintId)
      .eq('version_number', versionNumber)
      .single()

    if (error || !version) {
      return Response.json({ error: 'Version not found' }, { status: 404 })
    }

    // Enrich with creator profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', version.created_by)
      .single()

    return Response.json({
      ...version,
      created_by: {
        id: version.created_by,
        name: profile?.display_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
      },
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
