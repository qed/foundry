import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/blueprints/[blueprintId]/versions
 * List blueprint versions with pagination and profile enrichment.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; blueprintId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, blueprintId } = await params
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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Get total count
    const { count } = await supabase
      .from('blueprint_versions')
      .select('id', { count: 'exact', head: true })
      .eq('blueprint_id', blueprintId)

    // Get versions (newest first, no content for list view)
    const { data: versions, error } = await supabase
      .from('blueprint_versions')
      .select('id, version_number, created_by, created_at, change_note, trigger_type')
      .eq('blueprint_id', blueprintId)
      .order('version_number', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching versions:', error)
      return Response.json({ error: 'Failed to fetch versions' }, { status: 500 })
    }

    // Enrich with creator profiles
    const userIds = [...new Set((versions || []).map((v) => v.created_by))]
    const { data: profiles } = userIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds)
      : { data: [] }

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

    const enrichedVersions = (versions || []).map((v) => {
      const profile = profileMap.get(v.created_by)
      return {
        ...v,
        created_by: {
          id: v.created_by,
          name: profile?.display_name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
        },
      }
    })

    return Response.json({
      versions: enrichedVersions,
      total: count || 0,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
