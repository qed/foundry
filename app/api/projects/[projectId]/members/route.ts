import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(
  _request: Request,
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

    // Fetch project members
    const { data: members, error } = await supabase
      .from('project_members')
      .select('user_id, role')
      .eq('project_id', projectId)

    if (error) {
      console.error('Error fetching members:', error)
      return Response.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      )
    }

    // Enrich with profile data
    const userIds = (members || []).map((m) => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds)

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    )

    const enriched = (members || []).map((m) => {
      const profile = profileMap.get(m.user_id)
      return {
        user_id: m.user_id,
        role: m.role,
        display_name: profile?.display_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
      }
    })

    return Response.json({ members: enriched })
  } catch (err) {
    return handleAuthError(err)
  }
}
