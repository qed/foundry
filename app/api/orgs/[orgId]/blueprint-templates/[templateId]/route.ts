import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * PATCH /api/orgs/[orgId]/blueprint-templates/[templateId]
 * Update an org-level template. Admin only. Cannot edit system templates.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  try {
    const user = await requireAuth()
    const { orgId, templateId } = await params
    const body = await request.json()
    const { name, outline_content, is_default } = body
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

    // Fetch existing template
    const { data: existing } = await supabase
      .from('blueprint_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (!existing) {
      return Response.json({ error: 'Template not found' }, { status: 404 })
    }

    // Cannot edit system templates
    if (existing.org_id === null) {
      return Response.json({ error: 'Cannot edit system templates' }, { status: 403 })
    }

    // Must belong to this org
    if (existing.org_id !== orgId) {
      return Response.json({ error: 'Template does not belong to this organization' }, { status: 403 })
    }

    // Build update
    const updates: Record<string, unknown> = {}

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return Response.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      if (name.trim().length > 255) {
        return Response.json({ error: 'Name must be 255 characters or less' }, { status: 400 })
      }
      // Check name uniqueness
      const { data: dupe } = await supabase
        .from('blueprint_templates')
        .select('id')
        .eq('org_id', orgId)
        .eq('blueprint_type', existing.blueprint_type)
        .ilike('name', name.trim())
        .neq('id', templateId)
        .maybeSingle()

      if (dupe) {
        return Response.json({ error: 'A template with this name already exists' }, { status: 409 })
      }
      updates.name = name.trim()
    }

    if (outline_content !== undefined) {
      if (!outline_content.sections || !Array.isArray(outline_content.sections) || outline_content.sections.length === 0) {
        return Response.json({ error: 'At least one section is required' }, { status: 400 })
      }
      for (const section of outline_content.sections) {
        if (!section.title || typeof section.title !== 'string' || !section.title.trim()) {
          return Response.json({ error: 'Each section must have a title' }, { status: 400 })
        }
      }
      updates.outline_content = outline_content
    }

    if (is_default !== undefined) {
      if (is_default) {
        // Clear existing default for this type in org
        await supabase
          .from('blueprint_templates')
          .update({ is_default: false })
          .eq('org_id', orgId)
          .eq('blueprint_type', existing.blueprint_type)
          .eq('is_default', true)
      }
      updates.is_default = is_default
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ template: existing })
    }

    const { data: updated, error } = await supabase
      .from('blueprint_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return Response.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return Response.json({ template: updated })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * DELETE /api/orgs/[orgId]/blueprint-templates/[templateId]
 * Delete an org template. Admin only. Cannot delete system templates.
 */
export async function DELETE(
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

    // Fetch template
    const { data: template } = await supabase
      .from('blueprint_templates')
      .select('id, org_id')
      .eq('id', templateId)
      .single()

    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.org_id === null) {
      return Response.json({ error: 'Cannot delete system templates' }, { status: 403 })
    }

    if (template.org_id !== orgId) {
      return Response.json({ error: 'Template does not belong to this organization' }, { status: 403 })
    }

    const { error } = await supabase
      .from('blueprint_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      console.error('Error deleting template:', error)
      return Response.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return Response.json({ deleted: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
