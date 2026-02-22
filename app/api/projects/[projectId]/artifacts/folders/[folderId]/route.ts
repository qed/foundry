import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

const MAX_DEPTH = 3

/**
 * Calculate the depth of a folder (1 = root-level, 2 = one level deep, etc.)
 */
async function getFolderDepth(
  supabase: ReturnType<typeof createServiceClient>,
  folderId: string
): Promise<number> {
  let depth = 1
  let currentId = folderId as string | null

  while (currentId) {
    const { data: row } = await supabase
      .from('artifact_folders')
      .select('parent_folder_id')
      .eq('id', currentId as string)
      .single()

    if (!row || !row.parent_folder_id) break
    depth++
    currentId = row.parent_folder_id as string | null
  }

  return depth
}

/**
 * Get the maximum depth among all descendants of a folder.
 * Returns 0 if the folder has no children.
 */
async function getSubtreeDepth(
  supabase: ReturnType<typeof createServiceClient>,
  folderId: string
): Promise<number> {
  // Get direct children
  const { data: children } = await supabase
    .from('artifact_folders')
    .select('id')
    .eq('parent_folder_id', folderId)

  if (!children || children.length === 0) return 0

  let maxChildDepth = 0
  for (const child of children) {
    const childSubDepth = await getSubtreeDepth(supabase, child.id)
    maxChildDepth = Math.max(maxChildDepth, 1 + childSubDepth)
  }
  return maxChildDepth
}

/**
 * Check if targetId is a descendant of ancestorId (circular reference check).
 */
async function isDescendant(
  supabase: ReturnType<typeof createServiceClient>,
  ancestorId: string,
  targetId: string | null
): Promise<boolean> {
  if (!targetId) return false
  if (targetId === ancestorId) return true

  let currentId = targetId as string | null
  while (currentId) {
    const { data: row } = await supabase
      .from('artifact_folders')
      .select('parent_folder_id')
      .eq('id', currentId as string)
      .single()

    if (!row) break
    if (row.parent_folder_id === ancestorId) return true
    currentId = row.parent_folder_id as string | null
  }

  return false
}

/**
 * Count all nested folders and artifacts within a folder recursively.
 */
async function countFolderContents(
  supabase: ReturnType<typeof createServiceClient>,
  folderId: string
): Promise<{ folderCount: number; artifactCount: number }> {
  // Count artifacts directly in this folder
  const { count: directArtifacts } = await supabase
    .from('artifacts')
    .select('id', { count: 'exact', head: true })
    .eq('folder_id', folderId)

  // Get child folders
  const { data: children } = await supabase
    .from('artifact_folders')
    .select('id')
    .eq('parent_folder_id', folderId)

  let folderCount = children?.length || 0
  let artifactCount = directArtifacts || 0

  for (const child of children || []) {
    const childCounts = await countFolderContents(supabase, child.id)
    folderCount += childCounts.folderCount
    artifactCount += childCounts.artifactCount
  }

  return { folderCount, artifactCount }
}

/**
 * PATCH /api/projects/[projectId]/artifacts/folders/[folderId]
 * Rename or move a folder.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; folderId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, folderId } = await params
    const body = await request.json()
    const { name, parent_folder_id } = body

    const supabase = createServiceClient()

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Verify folder exists and belongs to project
    const { data: folder } = await supabase
      .from('artifact_folders')
      .select('*')
      .eq('id', folderId)
      .eq('project_id', projectId)
      .single()

    if (!folder) {
      return Response.json({ error: 'Folder not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}

    // Handle rename
    if (name !== undefined) {
      const trimmed = name.trim()
      if (!trimmed || trimmed.length > 255) {
        return Response.json({ error: 'Invalid folder name' }, { status: 400 })
      }

      // Check uniqueness within parent
      const parentId = parent_folder_id !== undefined ? parent_folder_id : folder.parent_folder_id
      let uniqueQuery = supabase
        .from('artifact_folders')
        .select('id')
        .eq('project_id', projectId)
        .eq('name', trimmed)
        .neq('id', folderId)

      if (parentId) {
        uniqueQuery = uniqueQuery.eq('parent_folder_id', parentId)
      } else {
        uniqueQuery = uniqueQuery.is('parent_folder_id', null)
      }

      const { data: dupCheck } = await uniqueQuery
      if (dupCheck && dupCheck.length > 0) {
        return Response.json({ error: 'A folder with that name already exists here' }, { status: 409 })
      }

      updates.name = trimmed
    }

    // Handle move
    if (parent_folder_id !== undefined && parent_folder_id !== folder.parent_folder_id) {
      // Can't move into self
      if (parent_folder_id === folderId) {
        return Response.json({ error: 'Cannot move folder into itself' }, { status: 400 })
      }

      // Check circular reference
      if (parent_folder_id && await isDescendant(supabase, folderId, parent_folder_id)) {
        return Response.json({ error: 'Cannot move folder into its own subtree' }, { status: 403 })
      }

      // Check depth limit
      const newParentDepth = parent_folder_id
        ? await getFolderDepth(supabase, parent_folder_id)
        : 0
      const subtreeDepth = await getSubtreeDepth(supabase, folderId)
      const resultingMaxDepth = newParentDepth + 1 + subtreeDepth

      if (resultingMaxDepth > MAX_DEPTH) {
        return Response.json(
          { error: `Cannot move: would exceed ${MAX_DEPTH}-level depth limit` },
          { status: 400 }
        )
      }

      updates.parent_folder_id = parent_folder_id
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No changes specified' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('artifact_folders')
      .update(updates)
      .eq('id', folderId)
      .select()
      .single()

    if (error || !updated) {
      return Response.json({ error: 'Failed to update folder' }, { status: 500 })
    }

    return Response.json(updated)
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * DELETE /api/projects/[projectId]/artifacts/folders/[folderId]
 * Delete a folder and cascade delete all contents.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; folderId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, folderId } = await params
    const supabase = createServiceClient()

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Verify folder exists
    const { data: folder } = await supabase
      .from('artifact_folders')
      .select('id')
      .eq('id', folderId)
      .eq('project_id', projectId)
      .single()

    if (!folder) {
      return Response.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Count contents for response
    const { folderCount, artifactCount } = await countFolderContents(supabase, folderId)

    // Delete the folder — CASCADE on parent_folder_id handles children,
    // SET NULL on artifacts.folder_id handles artifact references
    const { error } = await supabase
      .from('artifact_folders')
      .delete()
      .eq('id', folderId)

    if (error) {
      return Response.json({ error: 'Failed to delete folder' }, { status: 500 })
    }

    return Response.json({
      success: true,
      deleted_folder_count: folderCount + 1, // include self
      deleted_artifact_count: artifactCount,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * GET /api/projects/[projectId]/artifacts/folders/[folderId]
 * Get folder details including content counts.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; folderId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, folderId } = await params
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
      .select('*')
      .eq('id', folderId)
      .eq('project_id', projectId)
      .single()

    if (error || !folder) {
      return Response.json({ error: 'Folder not found' }, { status: 404 })
    }

    const { folderCount, artifactCount } = await countFolderContents(supabase, folderId)
    const depth = await getFolderDepth(supabase, folderId)

    return Response.json({
      ...folder,
      depth,
      child_folder_count: folderCount,
      artifact_count: artifactCount,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
