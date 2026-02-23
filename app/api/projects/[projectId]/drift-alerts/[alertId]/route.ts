import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; alertId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, alertId } = await params
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

    // Verify alert exists in project
    const { data: existing } = await supabase
      .from('drift_alerts')
      .select('id, status')
      .eq('id', alertId)
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      return Response.json({ error: 'Alert not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}

    if (body.status) {
      const validStatuses = ['new', 'acknowledged', 'resolved']
      if (!validStatuses.includes(body.status)) {
        return Response.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status

      if (body.status === 'resolved') {
        updates.resolved_at = new Date().toISOString()
        updates.resolved_by = user.id
      } else if (body.status !== 'resolved' && existing.status === 'resolved') {
        // Reopening
        updates.resolved_at = null
        updates.resolved_by = null
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('drift_alerts')
      .update(updates)
      .eq('id', alertId)
      .select('*')
      .single()

    if (updateErr) {
      console.error('Error updating drift alert:', updateErr)
      return Response.json({ error: 'Failed to update alert' }, { status: 500 })
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}
