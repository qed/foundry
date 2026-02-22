import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

const VALID_STATUSES = ['planned', 'active', 'completed']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; phaseId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, phaseId } = await params
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

    // Verify phase exists and belongs to project
    const { data: existing } = await supabase
      .from('phases')
      .select('id')
      .eq('id', phaseId)
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      return Response.json(
        { error: 'Phase not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.trim().length > 100) {
        return Response.json(
          { error: 'Name must be 1-100 characters' },
          { status: 400 }
        )
      }
      updates.name = body.name.trim()
    }

    if (body.description !== undefined) {
      if (body.description !== null && typeof body.description === 'string' && body.description.length > 255) {
        return Response.json(
          { error: 'Description must be 255 characters or less' },
          { status: 400 }
        )
      }
      updates.description = body.description?.trim() || null
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return Response.json(
          { error: `Status must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      updates.status = body.status
    }

    if (body.position !== undefined) {
      if (typeof body.position !== 'number' || body.position < 0) {
        return Response.json(
          { error: 'Position must be a non-negative number' },
          { status: 400 }
        )
      }
      updates.position = body.position
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data: phase, error } = await supabase
      .from('phases')
      .update(updates)
      .eq('id', phaseId)
      .select()
      .single()

    if (error) {
      console.error('Error updating phase:', error)
      return Response.json(
        { error: 'Failed to update phase' },
        { status: 500 }
      )
    }

    return Response.json({ phase })
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; phaseId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, phaseId } = await params
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

    // Verify phase exists and belongs to project
    const { data: existing } = await supabase
      .from('phases')
      .select('id')
      .eq('id', phaseId)
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      return Response.json(
        { error: 'Phase not found' },
        { status: 404 }
      )
    }

    // Unphase all work orders in this phase
    await supabase
      .from('work_orders')
      .update({ phase_id: null })
      .eq('phase_id', phaseId)

    // Delete the phase
    const { error } = await supabase
      .from('phases')
      .delete()
      .eq('id', phaseId)

    if (error) {
      console.error('Error deleting phase:', error)
      return Response.json(
        { error: 'Failed to delete phase' },
        { status: 500 }
      )
    }

    return Response.json({ success: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
