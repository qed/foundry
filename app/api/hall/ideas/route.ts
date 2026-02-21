import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { projectId, title, body, tagIds, newTags } = await request.json()

    // --- Validation ---
    if (!projectId || typeof projectId !== 'string') {
      return Response.json(
        { errors: { form: 'Project ID is required' } },
        { status: 400 }
      )
    }

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

    // --- Verify user belongs to project ---
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

    // --- Verify all provided tagIds belong to project ---
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      const { data: existingTags } = await supabase
        .from('tags')
        .select('id')
        .eq('project_id', projectId)
        .in('id', tagIds)

      if (!existingTags || existingTags.length !== tagIds.length) {
        return Response.json(
          { errors: { tags: 'One or more tags do not belong to this project' } },
          { status: 400 }
        )
      }
    }

    // --- Create idea ---
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .insert({
        project_id: projectId,
        title: title.trim(),
        body: body?.trim() || null,
        created_by: user.id,
        status: 'raw',
      })
      .select()
      .single()

    if (ideaError || !idea) {
      console.error('Error creating idea:', ideaError)
      return Response.json(
        { error: 'Failed to create idea' },
        { status: 500 }
      )
    }

    // --- Create new tags if provided ---
    const allTagIds: string[] = [...(tagIds || [])]

    if (newTags && Array.isArray(newTags) && newTags.length > 0) {
      for (const newTag of newTags) {
        if (!newTag.name || typeof newTag.name !== 'string') continue

        const { data: createdTag } = await supabase
          .from('tags')
          .insert({
            project_id: projectId,
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

    // --- Link tags to idea ---
    if (allTagIds.length > 0) {
      await supabase.from('idea_tags').insert(
        allTagIds.map((tagId) => ({
          idea_id: idea.id,
          tag_id: tagId,
        }))
      )
    }

    // --- Fetch complete idea with tags and creator ---
    const { data: completeIdea } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', idea.id)
      .single()

    // Fetch tags for this idea
    const { data: ideaTagRows } = await supabase
      .from('idea_tags')
      .select('tag_id')
      .eq('idea_id', idea.id)

    let tags: { id: string; name: string; color: string }[] = []
    if (ideaTagRows && ideaTagRows.length > 0) {
      const tagIdsForFetch = ideaTagRows.map((r) => r.tag_id)
      const { data: tagData } = await supabase
        .from('tags')
        .select('id, name, color')
        .in('id', tagIdsForFetch)

      tags = tagData || []
    }

    // Fetch creator profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single()

    return Response.json(
      {
        ...completeIdea,
        tags,
        creator: profile
          ? { display_name: profile.display_name, avatar_url: profile.avatar_url }
          : null,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleAuthError(error)
  }
}
