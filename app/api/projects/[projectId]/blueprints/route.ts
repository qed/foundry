import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { buildFeatureBlueprintTemplate } from '@/lib/blueprints/feature-template'
import type { BlueprintType } from '@/types/database'

const VALID_TYPES: BlueprintType[] = ['foundation', 'system_diagram', 'feature']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type')
    const search = searchParams.get('search')
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

    let query = supabase
      .from('blueprints')
      .select('*')
      .eq('project_id', projectId)

    if (typeFilter && VALID_TYPES.includes(typeFilter as BlueprintType)) {
      query = query.eq('blueprint_type', typeFilter as BlueprintType)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data: blueprints, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching blueprints:', error)
      return Response.json(
        { error: 'Failed to fetch blueprints' },
        { status: 500 }
      )
    }

    return Response.json({ blueprints: blueprints || [] })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * POST /api/projects/[projectId]/blueprints
 * Create a new blueprint. For feature blueprints, auto-populates title from feature node.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { blueprint_type, feature_node_id, title } = body

    if (!blueprint_type || !VALID_TYPES.includes(blueprint_type)) {
      return Response.json(
        { error: 'Invalid blueprint_type' },
        { status: 400 }
      )
    }

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

    let blueprintTitle = title?.trim() || 'Untitled Blueprint'
    let content = {}

    if (blueprint_type === 'feature') {
      if (!feature_node_id) {
        return Response.json(
          { error: 'feature_node_id is required for feature blueprints' },
          { status: 400 }
        )
      }

      // Verify feature node exists and belongs to project
      const { data: featureNode, error: fnErr } = await supabase
        .from('feature_nodes')
        .select('id, title, project_id')
        .eq('id', feature_node_id)
        .is('deleted_at', null)
        .single()

      if (fnErr || !featureNode) {
        return Response.json(
          { error: 'Feature node not found' },
          { status: 404 }
        )
      }

      if (featureNode.project_id !== projectId) {
        return Response.json(
          { error: 'Feature node does not belong to this project' },
          { status: 400 }
        )
      }

      // Check for existing blueprint (unique constraint)
      const { data: existing } = await supabase
        .from('blueprints')
        .select('id')
        .eq('project_id', projectId)
        .eq('feature_node_id', feature_node_id)
        .maybeSingle()

      if (existing) {
        return Response.json(
          { error: 'A blueprint already exists for this feature', existingId: existing.id },
          { status: 409 }
        )
      }

      // Auto-populate title from feature name
      blueprintTitle = title?.trim() || featureNode.title
      content = buildFeatureBlueprintTemplate()
    }

    const { data: blueprint, error: insertErr } = await supabase
      .from('blueprints')
      .insert({
        project_id: projectId,
        blueprint_type,
        feature_node_id: blueprint_type === 'feature' ? feature_node_id : null,
        title: blueprintTitle,
        content,
        status: 'draft' as const,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('Error creating blueprint:', insertErr)
      return Response.json(
        { error: 'Failed to create blueprint' },
        { status: 500 }
      )
    }

    return Response.json({ blueprint }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
