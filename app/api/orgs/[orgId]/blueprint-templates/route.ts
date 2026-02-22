import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { BlueprintType } from '@/types/database'

const VALID_TYPES: BlueprintType[] = ['foundation', 'system_diagram', 'feature']

/**
 * GET /api/orgs/[orgId]/blueprint-templates
 * Returns system + org templates.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await requireAuth()
    const { orgId } = await params
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type')
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

    // Fetch system templates
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
      .eq('org_id', orgId)
      .order('name')

    if (typeFilter && VALID_TYPES.includes(typeFilter as BlueprintType)) {
      orgQuery = orgQuery.eq('blueprint_type', typeFilter as BlueprintType)
    }

    const { data: orgTemplates } = await orgQuery

    return Response.json({
      system_templates: systemTemplates || [],
      org_templates: orgTemplates || [],
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * POST /api/orgs/[orgId]/blueprint-templates
 * Create a new org-level blueprint template. Admin only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await requireAuth()
    const { orgId } = await params
    const body = await request.json()
    const { name, blueprint_type, outline_content, is_default } = body
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

    // Validate
    if (!name || typeof name !== 'string' || !name.trim()) {
      return Response.json({ error: 'Name is required' }, { status: 400 })
    }
    if (name.trim().length > 255) {
      return Response.json({ error: 'Name must be 255 characters or less' }, { status: 400 })
    }
    if (!blueprint_type || !VALID_TYPES.includes(blueprint_type)) {
      return Response.json({ error: 'Valid blueprint_type is required' }, { status: 400 })
    }
    if (!outline_content || !outline_content.sections || !Array.isArray(outline_content.sections) || outline_content.sections.length === 0) {
      return Response.json({ error: 'At least one section is required' }, { status: 400 })
    }

    // Validate sections
    for (const section of outline_content.sections) {
      if (!section.title || typeof section.title !== 'string' || !section.title.trim()) {
        return Response.json({ error: 'Each section must have a title' }, { status: 400 })
      }
      if (section.title.length > 100) {
        return Response.json({ error: 'Section title must be 100 characters or less' }, { status: 400 })
      }
    }

    // Check name uniqueness within org + type
    const { data: existing } = await supabase
      .from('blueprint_templates')
      .select('id')
      .eq('org_id', orgId)
      .eq('blueprint_type', blueprint_type as BlueprintType)
      .ilike('name', name.trim())
      .maybeSingle()

    if (existing) {
      return Response.json({ error: 'A template with this name already exists for this type' }, { status: 409 })
    }

    // If marking as default, clear existing default for this type in org
    if (is_default) {
      await supabase
        .from('blueprint_templates')
        .update({ is_default: false })
        .eq('org_id', orgId)
        .eq('blueprint_type', blueprint_type as BlueprintType)
        .eq('is_default', true)
    }

    const { data: template, error } = await supabase
      .from('blueprint_templates')
      .insert({
        org_id: orgId,
        name: name.trim(),
        blueprint_type: blueprint_type as BlueprintType,
        outline_content,
        is_default: is_default || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return Response.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return Response.json({ template }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
