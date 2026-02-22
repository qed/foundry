import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/blueprints/[blueprintId]/activities
 * Fetch activity timeline for a blueprint.
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
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Verify blueprint belongs to this project
    const { data: blueprint } = await supabase
      .from('blueprints')
      .select('id')
      .eq('id', blueprintId)
      .eq('project_id', projectId)
      .single()

    if (!blueprint) {
      return Response.json({ error: 'Blueprint not found' }, { status: 404 })
    }

    // Fetch activities
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const { data: activities, error } = await supabase
      .from('blueprint_activities')
      .select('*')
      .eq('blueprint_id', blueprintId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching blueprint activities:', error)
      return Response.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    // Enrich with user profiles
    const userIds = [...new Set((activities || []).map((a) => a.user_id))]
    let profileMap: Record<string, { display_name: string; avatar_url: string | null }> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
      }
    }

    const enriched = (activities || []).map((a) => ({
      ...a,
      user: profileMap[a.user_id] || { display_name: 'Unknown', avatar_url: null },
    }))

    return Response.json({ activities: enriched })
  } catch (err) {
    return handleAuthError(err)
  }
}
