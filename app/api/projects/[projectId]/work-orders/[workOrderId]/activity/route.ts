import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; workOrderId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, workOrderId } = await params
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

    // Verify work order belongs to project
    const { data: workOrder } = await supabase
      .from('work_orders')
      .select('id')
      .eq('id', workOrderId)
      .eq('project_id', projectId)
      .single()

    if (!workOrder) {
      return Response.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Fetch activity entries
    const { data: activities, error } = await supabase
      .from('work_order_activity')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching activity:', error)
      return Response.json(
        { error: 'Failed to fetch activity' },
        { status: 500 }
      )
    }

    // Enrich with user profiles
    const userIds = [...new Set((activities || []).map((a) => a.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds)

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    )

    const enriched = (activities || []).map((a) => ({
      ...a,
      user: profileMap.get(a.user_id) || { display_name: 'Unknown', avatar_url: null },
    }))

    return Response.json({ activities: enriched })
  } catch (err) {
    return handleAuthError(err)
  }
}
