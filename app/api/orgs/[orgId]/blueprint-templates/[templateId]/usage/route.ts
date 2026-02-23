import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/orgs/[orgId]/blueprint-templates/[templateId]/usage
 * Returns blueprints created from this template across all projects in the org.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  try {
    const user = await requireAuth()
    const { orgId, templateId } = await params
    const supabase = createServiceClient()

    // Verify org membership
    const { data: membership } = await supabase
      .from('org_members')
      .select('id, role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Verify template belongs to this org
    const { data: template } = await supabase
      .from('blueprint_templates')
      .select('id, org_id, name')
      .eq('id', templateId)
      .single()

    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 })
    }

    // System templates (org_id null) can be queried by any org member
    if (template.org_id !== null && template.org_id !== orgId) {
      return Response.json({ error: 'Template does not belong to this organization' }, { status: 403 })
    }

    // Find blueprints using this template
    const { data: blueprints, error } = await supabase
      .from('blueprints')
      .select('id, title, blueprint_type, status, project_id, created_at')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching template usage:', error)
      return Response.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    // Enrich with project names
    const projectIds = [...new Set((blueprints || []).map((b) => b.project_id))]
    let projectMap = new Map<string, { name: string }>()

    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds)

      projectMap = new Map((projects || []).map((p) => [p.id, { name: p.name }]))
    }

    const enriched = (blueprints || []).map((bp) => ({
      ...bp,
      project_name: projectMap.get(bp.project_id)?.name || 'Unknown Project',
    }))

    return Response.json({
      blueprints: enriched,
      total: enriched.length,
      project_count: projectIds.length,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
