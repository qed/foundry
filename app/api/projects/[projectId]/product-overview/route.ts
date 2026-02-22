import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { PRODUCT_OVERVIEW_TEMPLATE } from '@/lib/shop/product-overview-template'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
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

    // Try to fetch existing product overview
    const { data: doc } = await supabase
      .from('requirements_documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('doc_type', 'product_overview')
      .single()

    if (doc) {
      return Response.json(doc)
    }

    // Lazy-create if missing
    const { data: newDoc, error: createError } = await supabase
      .from('requirements_documents')
      .insert({
        project_id: projectId,
        feature_node_id: null,
        doc_type: 'product_overview' as const,
        title: 'Product Overview',
        content: PRODUCT_OVERVIEW_TEMPLATE,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating product overview:', createError)
      return Response.json(
        { error: 'Failed to create product overview' },
        { status: 500 }
      )
    }

    return Response.json(newDoc, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { title, content } = await request.json()
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

    // Find the product overview document
    const { data: doc } = await supabase
      .from('requirements_documents')
      .select('id')
      .eq('project_id', projectId)
      .eq('doc_type', 'product_overview')
      .single()

    if (!doc) {
      return Response.json(
        { error: 'Product overview not found' },
        { status: 404 }
      )
    }

    // Update
    const updates: Record<string, string> = {}
    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('requirements_documents')
      .update(updates)
      .eq('id', doc.id)
      .select('id, updated_at')
      .single()

    if (updateError) {
      console.error('Error updating product overview:', updateError)
      return Response.json(
        { error: 'Failed to update product overview' },
        { status: 500 }
      )
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}
