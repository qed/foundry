import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

const MAX_DEPTH = 3

/**
 * GET /api/projects/[projectId]/artifacts/folders
 * List artifact folders, optionally filtered by parent folder.
 * Pass ?all=true to get all folders in the project (flat list).
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
    const all = request.nextUrl.searchParams.get('all')

    let query = supabase
      .from('artifact_folders')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true })

    // If ?all=true, return all folders (flat list for tree building)
    if (all !== 'true') {
      if (parentId) {
        query = query.eq('parent_folder_id', parentId)
      } else {
        query = query.is('parent_folder_id', null)
      }
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

    // Validate depth limit (3 levels max)
    if (parentFolderId) {
      let depth = 1
      let currentId: string | null = parentFolderId
      while (currentId) {
        depth++
        const { data: parent } = await supabase
          .from('artifact_folders')
          .select('parent_folder_id')
          .eq('id', currentId)
          .single()
        if (!parent) break
        currentId = parent.parent_folder_id
      }
      if (depth > MAX_DEPTH) {
        return Response.json(
          { error: `Cannot create folder: would exceed ${MAX_DEPTH}-level depth limit` },
          { status: 400 }
        )
      }
    }

    // Check name uniqueness within parent
    let uniqueQuery = supabase
      .from('artifact_folders')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', name.trim())

    if (parentFolderId) {
      uniqueQuery = uniqueQuery.eq('parent_folder_id', parentFolderId)
    } else {
      uniqueQuery = uniqueQuery.is('parent_folder_id', null)
    }

    const { data: dupCheck } = await uniqueQuery
    if (dupCheck && dupCheck.length > 0) {
      return Response.json({ error: 'A folder with that name already exists here' }, { status: 409 })
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
