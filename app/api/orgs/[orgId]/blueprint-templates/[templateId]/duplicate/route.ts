import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/orgs/[orgId]/blueprint-templates/[templateId]/duplicate
 * Duplicate a template within the org. Admin only.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  try {
    const user = await requireAuth()
    const { orgId, templateId } = await params
    const supabase = createServiceClient()

    // Verify admin
    const { data: membership } = await supabase
      .from('org_members')
      .select('id, role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch source template
    const { data: source } = await supabase
      .from('blueprint_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (!source) {
      return Response.json({ error: 'Template not found' }, { status: 404 })
    }

    // System templates can be duplicated into the org
    // Org templates must belong to this org
    if (source.org_id !== null && source.org_id !== orgId) {
      return Response.json({ error: 'Template does not belong to this organization' }, { status: 403 })
    }

    // Generate unique name
    let copyName = `${source.name} (Copy)`
    let attempt = 1
    while (attempt <= 10) {
      const { data: existing } = await supabase
        .from('blueprint_templates')
        .select('id')
        .eq('org_id', orgId)
        .ilike('name', copyName)
        .maybeSingle()

      if (!existing) break
      attempt++
      copyName = `${source.name} (Copy ${attempt})`
    }

    const { data: duplicate, error } = await supabase
      .from('blueprint_templates')
      .insert({
        org_id: orgId,
        name: copyName,
        blueprint_type: source.blueprint_type,
        outline_content: source.outline_content,
        is_default: false,
        description: source.description,
        category: source.category,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error duplicating template:', error)
      return Response.json({ error: 'Failed to duplicate template' }, { status: 500 })
    }

    return Response.json({ template: duplicate }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
