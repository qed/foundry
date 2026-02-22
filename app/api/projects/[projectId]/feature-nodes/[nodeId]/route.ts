import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; nodeId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, nodeId } = await params
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
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    // Verify node belongs to project
    const { data: existing } = await supabase
      .from('feature_nodes')
      .select('id')
      .eq('id', nodeId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (!existing) {
      return Response.json(
        { error: 'Feature node not found' },
        { status: 404 }
      )
    }

    // Build update object from allowed fields
    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title.trim()
    if (body.description !== undefined) updates.description = body.description?.trim() || null

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('feature_nodes')
      .update(updates)
      .eq('id', nodeId)
      .select()
      .single()

    if (updateErr) {
      console.error('Error updating feature node:', updateErr)
      return Response.json(
        { error: 'Failed to update feature node' },
        { status: 500 }
      )
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; nodeId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, nodeId } = await params
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

    // Soft delete
    const { error: deleteErr } = await supabase
      .from('feature_nodes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', nodeId)
      .eq('project_id', projectId)

    if (deleteErr) {
      console.error('Error deleting feature node:', deleteErr)
      return Response.json(
        { error: 'Failed to delete feature node' },
        { status: 500 }
      )
    }

    return Response.json({ success: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
