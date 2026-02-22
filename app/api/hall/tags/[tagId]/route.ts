import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const user = await requireAuth()
    const { tagId } = await params
    const { name, color } = await request.json()

    const supabase = createServiceClient()

    // Fetch tag to verify it exists and get project_id
    const { data: tag } = await supabase
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single()

    if (!tag) {
      return Response.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Verify user belongs to project
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', tag.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    const updates: Record<string, string> = {}

    if (name !== undefined) {
      const trimmedName = name.trim()
      if (!trimmedName) {
        return Response.json(
          { error: 'Tag name is required' },
          { status: 400 }
        )
      }
      if (trimmedName.length > 30) {
        return Response.json(
          { error: 'Tag name must be 30 characters or less' },
          { status: 400 }
        )
      }

      // Check for duplicate name (excluding this tag)
      const { data: existing } = await supabase
        .from('tags')
        .select('id')
        .eq('project_id', tag.project_id)
        .ilike('name', trimmedName)
        .neq('id', tagId)
        .single()

      if (existing) {
        return Response.json(
          { error: 'A tag with this name already exists' },
          { status: 409 }
        )
      }

      updates.name = trimmedName
    }

    if (color !== undefined) {
      updates.color = color
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data: updated, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', tagId)
      .select()
      .single()

    if (error) {
      console.error('Error updating tag:', error)
      return Response.json(
        { error: 'Failed to update tag' },
        { status: 500 }
      )
    }

    return Response.json(updated)
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const user = await requireAuth()
    const { tagId } = await params

    const supabase = createServiceClient()

    // Fetch tag to verify it exists and get project_id
    const { data: tag } = await supabase
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single()

    if (!tag) {
      return Response.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Verify user belongs to project
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', tag.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    // Get usage count for response
    const { count } = await supabase
      .from('idea_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tagId)

    // Delete idea_tags associations first
    const { error: unlinkError } = await supabase
      .from('idea_tags')
      .delete()
      .eq('tag_id', tagId)

    if (unlinkError) {
      console.error('Error unlinking tag:', unlinkError)
      return Response.json(
        { error: 'Failed to remove tag from ideas' },
        { status: 500 }
      )
    }

    // Delete the tag
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId)

    if (deleteError) {
      console.error('Error deleting tag:', deleteError)
      return Response.json(
        { error: 'Failed to delete tag' },
        { status: 500 }
      )
    }

    return Response.json({
      deleted: true,
      tag,
      removedFromIdeas: count || 0,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
