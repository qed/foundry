import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { SYSTEM_TEMPLATES, outlineToTipTapContent } from '@/lib/blueprints/system-templates'
import type { TemplateOutline } from '@/lib/blueprints/system-templates'
import type { BlueprintType, BlueprintTemplate } from '@/types/database'

const VALID_TYPES: BlueprintType[] = ['foundation', 'system_diagram', 'feature']

/**
 * GET /api/projects/[projectId]/blueprint-templates
 * Returns system + org templates for this project's organization.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type')
    const supabase = createServiceClient()

    // Verify project membership and get org_id
    const { data: project } = await supabase
      .from('projects')
      .select('id, org_id')
      .eq('id', projectId)
      .single()

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch system templates (org_id IS NULL)
    let systemQuery = supabase
      .from('blueprint_templates')
      .select('*')
      .is('org_id', null)
      .order('name')

    if (typeFilter && VALID_TYPES.includes(typeFilter as BlueprintType)) {
      systemQuery = systemQuery.eq('blueprint_type', typeFilter as BlueprintType)
    }

    const { data: systemTemplates } = await systemQuery

    // Fetch org templates
    let orgQuery = supabase
      .from('blueprint_templates')
      .select('*')
      .eq('org_id', project.org_id)
      .order('name')

    if (typeFilter && VALID_TYPES.includes(typeFilter as BlueprintType)) {
      orgQuery = orgQuery.eq('blueprint_type', typeFilter as BlueprintType)
    }

    const { data: orgTemplates } = await orgQuery

    // If no system templates in DB, fall back to hardcoded definitions
    let system: BlueprintTemplate[] = systemTemplates || []
    if (system.length === 0) {
      system = SYSTEM_TEMPLATES
        .filter((t) => !typeFilter || t.blueprint_type === typeFilter)
        .map((t) => ({
          id: `system-${t.blueprint_type}`,
          org_id: null,
          name: t.name,
          blueprint_type: t.blueprint_type,
          outline_content: t.outline as unknown as BlueprintTemplate['outline_content'],
          is_default: true,
          created_at: new Date().toISOString(),
        }))
    }

    return Response.json({
      system_templates: system,
      org_templates: orgTemplates || [],
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * POST /api/projects/[projectId]/blueprint-templates/apply
 * Convert a template outline into TipTap content for blueprint creation.
 * This is a utility endpoint — actual blueprint creation still uses POST /blueprints.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await requireAuth()
    await params
    const body = await request.json()
    const { outline_content } = body

    if (!outline_content || !outline_content.sections) {
      return Response.json({ error: 'outline_content with sections is required' }, { status: 400 })
    }

    const content = outlineToTipTapContent(outline_content as TemplateOutline)
    return Response.json({ content })
  } catch (err) {
    return handleAuthError(err)
  }
}
