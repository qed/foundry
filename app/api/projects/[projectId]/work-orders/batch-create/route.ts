import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { WorkOrderPriority } from '@/types/database'

const VALID_PRIORITIES: WorkOrderPriority[] = ['critical', 'high', 'medium', 'low']

interface BatchItem {
  title: string
  description?: string | null
  acceptance_criteria?: string | null
  priority?: string
  phase_id?: string | null
  feature_node_id?: string | null
  source_blueprint_id?: string | null
}

/**
 * POST /api/projects/[projectId]/work-orders/batch-create
 * Create multiple work orders in a single operation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { work_orders } = body as { work_orders: BatchItem[] }

    if (!work_orders || !Array.isArray(work_orders) || work_orders.length === 0) {
      return Response.json({ error: 'work_orders array is required' }, { status: 400 })
    }

    if (work_orders.length > 50) {
      return Response.json({ error: 'Maximum 50 work orders per batch' }, { status: 400 })
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

    // Get current max position
    const { data: maxPos } = await supabase
      .from('work_orders')
      .select('position')
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    let nextPosition = (maxPos?.position ?? 0) + 1

    // Validate and prepare all items
    const inserts = []
    const failed: { index: number; title: string; error: string }[] = []

    for (let i = 0; i < work_orders.length; i++) {
      const item = work_orders[i]
      const title = (item.title || '').trim()

      if (!title || title.length < 3 || title.length > 255) {
        failed.push({ index: i, title: title || '(empty)', error: 'Title must be 3-255 characters' })
        continue
      }

      const priority = item.priority || 'medium'
      if (!VALID_PRIORITIES.includes(priority as WorkOrderPriority)) {
        failed.push({ index: i, title, error: 'Invalid priority' })
        continue
      }

      inserts.push({
        project_id: projectId,
        title,
        description: item.description || null,
        acceptance_criteria: item.acceptance_criteria || null,
        priority: priority as WorkOrderPriority,
        phase_id: item.phase_id || null,
        feature_node_id: item.feature_node_id || null,
        status: 'backlog' as const,
        position: nextPosition++,
        created_by: user.id,
      })
    }

    if (inserts.length === 0) {
      return Response.json({ error: 'No valid work orders to create', failed }, { status: 400 })
    }

    // Batch insert
    const { data: created, error: insertErr } = await supabase
      .from('work_orders')
      .insert(inserts)
      .select()

    if (insertErr) {
      console.error('Batch create error:', insertErr)
      return Response.json({ error: 'Failed to create work orders' }, { status: 500 })
    }

    // Log activity for each (fire-and-forget)
    if (created && created.length > 0) {
      const activities = created.map((wo) => ({
        work_order_id: wo.id,
        user_id: user.id,
        action: 'created' as const,
        details: { source: 'blueprint_extraction' },
      }))
      supabase.from('work_order_activity').insert(activities).then()
    }

    return Response.json({
      created_count: created?.length || 0,
      created_work_orders: created || [],
      failed,
    }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
