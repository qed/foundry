import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * PATCH /api/orgs/[orgId]/blueprint-templates/[templateId]/archive
 * Toggle archive state of an org template. Admin only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  try {
    const user = await requireAuth()
    const { orgId, templateId } = await params
    const body = await request.json()
    const { is_archived } = body
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
      .select('id, org_id, is_archived')
      .eq('id', templateId)
      .single()

    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.org_id === null) {
      return Response.json({ error: 'Cannot archive system templates' }, { status: 403 })
    }

    if (template.org_id !== orgId) {
      return Response.json({ error: 'Template does not belong to this organization' }, { status: 403 })
    }

    const newArchived = is_archived !== undefined ? Boolean(is_archived) : !template.is_archived

    const { data: updated, error } = await supabase
      .from('blueprint_templates')
      .update({ is_archived: newArchived })
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      console.error('Error archiving template:', error)
      return Response.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return Response.json({ template: updated })
  } catch (err) {
    return handleAuthError(err)
  }
}
