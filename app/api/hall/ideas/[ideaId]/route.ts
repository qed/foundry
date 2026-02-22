import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { IdeaStatus } from '@/types/database'

const VALID_EDIT_STATUSES: IdeaStatus[] = ['raw', 'developing', 'mature']

// Helper: fetch idea with tags + creator
async function fetchIdeaWithDetails(supabase: ReturnType<typeof createServiceClient>, ideaId: string) {
  const { data: idea, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', ideaId)
    .single()

  if (error || !idea) return null

  // Fetch tags
  const { data: ideaTagRows } = await supabase
    .from('idea_tags')
    .select('tag_id')
    .eq('idea_id', ideaId)

  let tags: { id: string; name: string; color: string }[] = []
  if (ideaTagRows && ideaTagRows.length > 0) {
    const tagIds = ideaTagRows.map((r) => r.tag_id)
    const { data: tagData } = await supabase
      .from('tags')
      .select('id, name, color')
      .in('id', tagIds)
    tags = tagData || []
  }

  // Fetch creator profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', idea.created_by)
    .single()

  return {
    ...idea,
    tags,
    creator: profile
      ? { display_name: profile.display_name, avatar_url: profile.avatar_url }
      : null,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const user = await requireAuth()
    const { ideaId } = await params

    if (!ideaId) {
      return Response.json({ error: 'Idea ID is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch idea
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', ideaId)
      .single()

    if (ideaError || !idea) {
      return Response.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Verify user belongs to the idea's project
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', idea.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    const fullIdea = await fetchIdeaWithDetails(supabase, ideaId)
    return Response.json(fullIdea)
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const user = await requireAuth()
    const { ideaId } = await params

    if (!ideaId) {
      return Response.json({ error: 'Idea ID is required' }, { status: 400 })
    }

    const { title, body, tagIds, newTags, status } = await request.json()

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return Response.json(
        { errors: { title: 'Title is required' } },
        { status: 400 }
      )
    }
    if (title.trim().length > 200) {
      return Response.json(
        { errors: { title: 'Title must be 200 characters or less' } },
        { status: 400 }
      )
    }
    if (body && typeof body === 'string' && body.length > 3000) {
      return Response.json(
        { errors: { body: 'Description must be 3000 characters or less' } },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Fetch idea and verify access
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('id, project_id, status')
      .eq('id', ideaId)
      .single()

    if (ideaError || !idea) {
      return Response.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Verify user belongs to project
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', idea.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Validate status transition — can only advance, never go backwards
    let newStatus = idea.status
    if (status && VALID_EDIT_STATUSES.includes(status as IdeaStatus)) {
      const statusOrder = ['raw', 'developing', 'mature']
      const currentIdx = statusOrder.indexOf(idea.status)
      const newIdx = statusOrder.indexOf(status)
      // Only allow forward transitions (or same status)
      if (idea.status === 'promoted' || idea.status === 'archived') {
        // Promoted/archived ideas can't have status changed via edit
      } else if (newIdx >= currentIdx) {
        newStatus = status as IdeaStatus
      }
    }

    // Update idea
    const { error: updateError } = await supabase
      .from('ideas')
      .update({
        title: title.trim(),
        body: body?.trim() || null,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ideaId)

    if (updateError) {
      console.error('Error updating idea:', updateError)
      return Response.json({ error: 'Failed to update idea' }, { status: 500 })
    }

    // Update tags if provided
    if (tagIds !== undefined) {
      // Delete existing tag links
      await supabase
        .from('idea_tags')
        .delete()
        .eq('idea_id', ideaId)

      // Create new tags if provided
      const allTagIds: string[] = [...(tagIds || [])]
      if (newTags && Array.isArray(newTags) && newTags.length > 0) {
        for (const newTag of newTags) {
          if (!newTag.name || typeof newTag.name !== 'string') continue
          const { data: createdTag } = await supabase
            .from('tags')
            .insert({
              project_id: idea.project_id,
              name: newTag.name.trim(),
              color: newTag.color || '#808080',
            })
            .select()
            .single()

          if (createdTag) {
            allTagIds.push(createdTag.id)
          }
        }
      }

      // Link tags
      if (allTagIds.length > 0) {
        await supabase.from('idea_tags').insert(
          allTagIds.map((tagId) => ({
            idea_id: ideaId,
            tag_id: tagId,
          }))
        )
      }
    }

    // Return full updated idea
    const fullIdea = await fetchIdeaWithDetails(supabase, ideaId)
    return Response.json(fullIdea)
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const user = await requireAuth()
    const { ideaId } = await params

    if (!ideaId) {
      return Response.json({ error: 'Idea ID is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch idea
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('id, project_id, status')
      .eq('id', ideaId)
      .single()

    if (ideaError || !idea) {
      return Response.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Verify access
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', idea.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Store previous status for undo
    const previousStatus = idea.status

    // Soft delete: set status to archived
    const { error: updateError } = await supabase
      .from('ideas')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ideaId)

    if (updateError) {
      console.error('Error archiving idea:', updateError)
      return Response.json({ error: 'Failed to archive idea' }, { status: 500 })
    }

    return Response.json({ id: ideaId, previousStatus })
  } catch (error) {
    return handleAuthError(error)
  }
}
