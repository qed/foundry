import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/projects/[projectId]/work-orders/bulk-delete
 * Delete multiple work orders.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { work_order_ids } = body as { work_order_ids: string[] }

    if (!work_order_ids || !Array.isArray(work_order_ids) || work_order_ids.length === 0) {
      return Response.json({ error: 'work_order_ids is required' }, { status: 400 })
    }

    if (work_order_ids.length > 200) {
      return Response.json({ error: 'Maximum 200 work orders per bulk delete' }, { status: 400 })
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

    // Delete activity entries first (FK constraint)
    await supabase
      .from('work_order_activity')
      .delete()
      .in('work_order_id', work_order_ids)

    // Delete work orders
    const { error: deleteErr, count } = await supabase
      .from('work_orders')
      .delete()
      .eq('project_id', projectId)
      .in('id', work_order_ids)

    if (deleteErr) {
      console.error('Bulk delete error:', deleteErr)
      return Response.json({ error: 'Failed to delete work orders' }, { status: 500 })
    }

    return Response.json({
      deleted_count: count || work_order_ids.length,
      deleted_ids: work_order_ids,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
