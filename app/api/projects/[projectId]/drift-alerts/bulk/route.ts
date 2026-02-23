import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
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

    const { alertIds, action } = body

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return Response.json({ error: 'alertIds required' }, { status: 400 })
    }

    if (alertIds.length > 100) {
      return Response.json({ error: 'Max 100 alerts per batch' }, { status: 400 })
    }

    const validActions = ['acknowledge', 'resolve']
    if (!validActions.includes(action)) {
      return Response.json({ error: 'Invalid action. Use: acknowledge, resolve' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}

    if (action === 'acknowledge') {
      updates.status = 'acknowledged'
    } else if (action === 'resolve') {
      updates.status = 'resolved'
      updates.resolved_at = new Date().toISOString()
      updates.resolved_by = user.id
    }

    const { error: updateErr } = await supabase
      .from('drift_alerts')
      .update(updates)
      .eq('project_id', projectId)
      .in('id', alertIds)

    if (updateErr) {
      console.error('Bulk drift alert update error:', updateErr)
      return Response.json({ error: 'Failed to update alerts' }, { status: 500 })
    }

    return Response.json({ updated: alertIds.length })
  } catch (err) {
    return handleAuthError(err)
  }
}
