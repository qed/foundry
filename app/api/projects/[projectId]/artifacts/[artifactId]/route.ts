import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/artifacts/[artifactId]
 * Get artifact details with preview metadata.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; artifactId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, artifactId } = await params
    const supabase = createServiceClient()

    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: artifact } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', artifactId)
      .eq('project_id', projectId)
      .single()

    if (!artifact) {
      return Response.json({ error: 'Artifact not found' }, { status: 404 })
    }

    // Get uploader profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', artifact.uploaded_by)
      .single()

    return Response.json({
      ...artifact,
      uploaded_by_profile: profile || null,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * PATCH /api/projects/[projectId]/artifacts/[artifactId]
 * Rename an artifact.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; artifactId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, artifactId } = await params
    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json({ error: 'Name is required' }, { status: 400 })
    }

    if (name.trim().length > 255) {
      return Response.json({ error: 'Name must be 255 characters or less' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: artifact, error } = await supabase
      .from('artifacts')
      .update({ name: name.trim() })
      .eq('id', artifactId)
      .eq('project_id', projectId)
      .select('id, name, updated_at')
      .single()

    if (error || !artifact) {
      return Response.json({ error: 'Failed to rename artifact' }, { status: 500 })
    }

    return Response.json(artifact)
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * DELETE /api/projects/[projectId]/artifacts/[artifactId]
 * Delete an artifact from database and storage.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; artifactId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, artifactId } = await params
    const supabase = createServiceClient()

    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get artifact to find storage path
    const { data: artifact } = await supabase
      .from('artifacts')
      .select('storage_path')
      .eq('id', artifactId)
      .eq('project_id', projectId)
      .single()

    if (!artifact) {
      return Response.json({ error: 'Artifact not found' }, { status: 404 })
    }

    // Delete from storage
    if (artifact.storage_path) {
      await supabase.storage.from('artifacts').remove([artifact.storage_path])
    }

    // Delete from database
    const { error } = await supabase
      .from('artifacts')
      .delete()
      .eq('id', artifactId)
      .eq('project_id', projectId)

    if (error) {
      return Response.json({ error: 'Failed to delete artifact' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
