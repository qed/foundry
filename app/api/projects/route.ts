import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { PRODUCT_OVERVIEW_TEMPLATE } from '@/lib/shop/product-overview-template'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { name, description, org_id } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    if (!org_id) {
      return Response.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Verify user is a member of the organization
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', org_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      )
    }

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        org_id,
      })
      .select()
      .single()

    if (projectError) {
      return Response.json({ error: projectError.message }, { status: 500 })
    }

    // Add creator as project leader
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: 'leader',
      })

    if (memberError) {
      await supabase.from('projects').delete().eq('id', project.id)
      return Response.json({ error: memberError.message }, { status: 500 })
    }

    // Auto-create product overview document
    await supabase.from('requirements_documents').insert({
      project_id: project.id,
      feature_node_id: null,
      doc_type: 'product_overview' as const,
      title: 'Product Overview',
      content: PRODUCT_OVERVIEW_TEMPLATE,
      created_by: user.id,
    })

    return Response.json(project, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
