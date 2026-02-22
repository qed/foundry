import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { buildFrdTemplate } from '@/lib/shop/frd-template'
import type { DocType } from '@/types/database'

const VALID_DOC_TYPES: DocType[] = ['product_overview', 'feature_requirement', 'technical_requirement']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const featureNodeId = searchParams.get('featureNodeId')
    const docType = searchParams.get('docType')
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

    // Build query
    let query = supabase
      .from('requirements_documents')
      .select('*')
      .eq('project_id', projectId)

    if (featureNodeId) {
      query = query.eq('feature_node_id', featureNodeId)
    }
    if (docType && VALID_DOC_TYPES.includes(docType as DocType)) {
      query = query.eq('doc_type', docType as DocType)
    }

    const { data: documents, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching requirements documents:', error)
      return Response.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    return Response.json({ documents: documents || [] })
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { featureNodeId } = await request.json()
    const supabase = createServiceClient()

    if (!featureNodeId) {
      return Response.json(
        { error: 'feature_node_id is required' },
        { status: 400 }
      )
    }

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

    // Fetch the feature node to get its title
    const { data: node, error: nodeErr } = await supabase
      .from('feature_nodes')
      .select('id, title, project_id')
      .eq('id', featureNodeId)
      .is('deleted_at', null)
      .single()

    if (nodeErr || !node) {
      return Response.json(
        { error: 'Feature node not found' },
        { status: 404 }
      )
    }

    if (node.project_id !== projectId) {
      return Response.json(
        { error: 'Feature node does not belong to this project' },
        { status: 400 }
      )
    }

    // Check for existing FRD
    const { data: existing } = await supabase
      .from('requirements_documents')
      .select('id')
      .eq('feature_node_id', featureNodeId)
      .eq('doc_type', 'feature_requirement')
      .single()

    if (existing) {
      return Response.json(
        { error: 'FRD already exists for this feature node' },
        { status: 409 }
      )
    }

    // Create FRD
    const title = `${node.title} - Feature Requirement`
    const content = buildFrdTemplate(node.title)

    const { data: doc, error: insertErr } = await supabase
      .from('requirements_documents')
      .insert({
        project_id: projectId,
        feature_node_id: featureNodeId,
        doc_type: 'feature_requirement' as const,
        title,
        content,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('Error creating FRD:', insertErr)
      return Response.json(
        { error: 'Failed to create requirements document' },
        { status: 500 }
      )
    }

    return Response.json(doc, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
