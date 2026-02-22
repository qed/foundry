import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const phaseId = searchParams.get('phaseId')
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

    let query = supabase
      .from('work_orders')
      .select('*')
      .eq('project_id', projectId)

    if (phaseId) {
      query = query.eq('phase_id', phaseId)
    }

    const { data: workOrders, error } = await query.order('position', { ascending: true })

    if (error) {
      console.error('Error fetching work orders:', error)
      return Response.json(
        { error: 'Failed to fetch work orders' },
        { status: 500 }
      )
    }

    return Response.json({ workOrders: workOrders || [] })
  } catch (err) {
    return handleAuthError(err)
  }
}
