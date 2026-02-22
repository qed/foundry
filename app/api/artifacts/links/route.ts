import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

const VALID_ENTITY_TYPES = ['idea', 'feature', 'blueprint', 'work_order', 'feedback'] as const

/**
 * POST /api/artifacts/links
 * Create an artifact-entity link.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { artifact_id, entity_type, entity_id } = await request.json()

    if (!artifact_id || !entity_type || !entity_id) {
      return Response.json({ error: 'artifact_id, entity_type, and entity_id required' }, { status: 400 })
    }

    if (!VALID_ENTITY_TYPES.includes(entity_type)) {
      return Response.json({ error: 'Invalid entity_type' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify artifact exists and user has access
    const { data: artifact } = await supabase
      .from('artifacts')
      .select('project_id')
      .eq('id', artifact_id)
      .single()

    if (!artifact) {
      return Response.json({ error: 'Artifact not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', artifact.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Check for existing link
    const { data: existing } = await supabase
      .from('artifact_entity_links')
      .select('id')
      .eq('artifact_id', artifact_id)
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .maybeSingle()

    if (existing) {
      return Response.json({ error: 'Link already exists' }, { status: 409 })
    }

    const { data: link, error } = await supabase
      .from('artifact_entity_links')
      .insert({
        artifact_id,
        entity_type,
        entity_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (error || !link) {
      return Response.json({ error: 'Failed to create link' }, { status: 500 })
    }

    return Response.json(link, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * GET /api/artifacts/links?entity_type=idea&entity_id={id}
 * Get all artifacts linked to an entity.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const entityType = request.nextUrl.searchParams.get('entity_type') as
      | 'idea' | 'feature' | 'blueprint' | 'work_order' | 'feedback'
      | null
    const entityId = request.nextUrl.searchParams.get('entity_id')

    if (!entityType || !entityId) {
      return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 })
    }

    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return Response.json({ error: 'Invalid entity_type' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get links with artifact details
    const { data: links, error } = await supabase
      .from('artifact_entity_links')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: 'Failed to fetch links' }, { status: 500 })
    }

    if (!links || links.length === 0) {
      return Response.json({ links: [] })
    }

    // Fetch artifact details
    const artifactIds = links.map((l) => l.artifact_id)
    const { data: artifacts } = await supabase
      .from('artifacts')
      .select('id, name, file_type, file_size, storage_path, project_id')
      .in('id', artifactIds)

    // Verify user has access to the project
    if (artifacts && artifacts.length > 0) {
      const projectId = artifacts[0].project_id
      const { data: membership } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        return Response.json({ error: 'Not authorized' }, { status: 403 })
      }
    }

    // Fetch creator profiles
    const creatorIds = [...new Set(links.map((l) => l.created_by))]
    const { data: profiles } = creatorIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', creatorIds)
      : { data: [] }

    const artifactMap = new Map((artifacts || []).map((a) => [a.id, a]))
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

    const enriched = links
      .map((link) => ({
        id: link.id,
        artifact_id: link.artifact_id,
        artifact: artifactMap.get(link.artifact_id) || null,
        created_by: profileMap.get(link.created_by) || null,
        created_at: link.created_at,
      }))
      .filter((l) => l.artifact !== null)

    return Response.json({ links: enriched })
  } catch (err) {
    return handleAuthError(err)
  }
}
