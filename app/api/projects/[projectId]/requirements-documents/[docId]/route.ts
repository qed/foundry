import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, docId } = await params
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

    const { data: doc, error } = await supabase
      .from('requirements_documents')
      .select('*')
      .eq('id', docId)
      .eq('project_id', projectId)
      .single()

    if (error || !doc) {
      return Response.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return Response.json(doc)
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, docId } = await params
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

    // Verify doc exists and belongs to project
    const { data: existing } = await supabase
      .from('requirements_documents')
      .select('id')
      .eq('id', docId)
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      return Response.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const updates: Record<string, string> = {}
    if (body.title !== undefined) {
      if (typeof body.title === 'string' && body.title.length > 255) {
        return Response.json({ error: 'Title must not exceed 255 characters' }, { status: 400 })
      }
      updates.title = body.title
    }
    if (body.content !== undefined) {
      if (typeof body.content === 'string' && body.content.length > 50000) {
        return Response.json({ error: 'Content must not exceed 50,000 characters' }, { status: 400 })
      }
      updates.content = body.content
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('requirements_documents')
      .update(updates)
      .eq('id', docId)
      .select('id, updated_at')
      .single()

    if (updateErr) {
      console.error('Error updating document:', updateErr)
      return Response.json(
        { error: 'Failed to update document' },
        { status: 500 }
      )
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}
