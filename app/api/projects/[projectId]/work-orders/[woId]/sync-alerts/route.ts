import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/work-orders/[woId]/sync-alerts
 * List sync alerts for a work order, optionally filtered by status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; woId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, woId } = await params
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('wo_sync_alerts')
      .select('*')
      .eq('work_order_id', woId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status as 'new' | 'acknowledged' | 'resolved')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching sync alerts:', error)
      return Response.json({ error: 'Failed to fetch sync alerts' }, { status: 500 })
    }

    // Enrich with blueprint titles
    const blueprintIds = [...new Set((data || []).map((a) => a.blueprint_id))]
    let blueprintMap: Record<string, string> = {}

    if (blueprintIds.length > 0) {
      const { data: blueprints } = await supabase
        .from('blueprints')
        .select('id, title')
        .in('id', blueprintIds)

      if (blueprints) {
        blueprintMap = Object.fromEntries(blueprints.map((b) => [b.id, b.title]))
      }
    }

    const enriched = (data || []).map((alert) => ({
      ...alert,
      blueprint_title: blueprintMap[alert.blueprint_id] || 'Unknown Blueprint',
    }))

    return Response.json({ alerts: enriched })
  } catch (err) {
    return handleAuthError(err)
  }
}
