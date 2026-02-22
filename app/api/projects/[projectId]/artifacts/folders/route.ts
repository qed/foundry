import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/artifacts/folders
 * List artifact folders, optionally filtered by parent folder.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
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

    const parentId = request.nextUrl.searchParams.get('parentId')

    let query = supabase
      .from('artifact_folders')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true })

    if (parentId) {
      query = query.eq('parent_folder_id', parentId)
    } else {
      query = query.is('parent_folder_id', null)
    }

    const { data: folders, error } = await query

    if (error) {
      return Response.json({ error: 'Failed to fetch folders' }, { status: 500 })
    }

    return Response.json({ folders: folders || [] })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * POST /api/projects/[projectId]/artifacts/folders
 * Create a new artifact folder.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { name, parentFolderId } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json({ error: 'Folder name is required' }, { status: 400 })
    }

    if (name.trim().length > 255) {
      return Response.json({ error: 'Folder name must be 255 characters or less' }, { status: 400 })
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

    const { data: folder, error } = await supabase
      .from('artifact_folders')
      .insert({
        project_id: projectId,
        parent_folder_id: parentFolderId || null,
        name: name.trim(),
        created_by: user.id,
      })
      .select()
      .single()

    if (error || !folder) {
      return Response.json({ error: 'Failed to create folder' }, { status: 500 })
    }

    return Response.json({ folder }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
