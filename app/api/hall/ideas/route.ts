import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { IdeaStatus } from '@/types/database'

const VALID_STATUSES: IdeaStatus[] = ['raw', 'developing', 'mature', 'promoted', 'archived']

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)

    const projectId = searchParams.get('projectId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 50)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)
    const sort = searchParams.get('sort') || 'newest'
    const search = searchParams.get('search') || ''
    const statusParam = searchParams.get('status') || ''
    const status = VALID_STATUSES.includes(statusParam as IdeaStatus)
      ? (statusParam as IdeaStatus)
      : null
    const tagsParam = searchParams.get('tags') || ''
    const tagIds = tagsParam ? tagsParam.split(',').filter(Boolean) : []

    if (!projectId) {
      return Response.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify user belongs to project
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // If tag filtering, find idea_ids that have ALL selected tags (AND logic)
    let tagMatchedIdeaIds: string[] | null = null
    if (tagIds.length > 0) {
      const { data: ideaTagRows } = await supabase
        .from('idea_tags')
        .select('idea_id, tag_id')
        .in('tag_id', tagIds)

      if (ideaTagRows && ideaTagRows.length > 0) {
        const ideaTagCounts = new Map<string, number>()
        for (const row of ideaTagRows) {
          ideaTagCounts.set(row.idea_id, (ideaTagCounts.get(row.idea_id) || 0) + 1)
        }
        tagMatchedIdeaIds = [...ideaTagCounts.entries()]
          .filter(([, count]) => count >= tagIds.length)
          .map(([ideaId]) => ideaId)
      } else {
        tagMatchedIdeaIds = []
      }

      // Short-circuit if no ideas match all tags
      if (tagMatchedIdeaIds.length === 0) {
        return Response.json({ ideas: [], total: 0, hasMore: false })
      }
    }

    // Build count query (same filters, no pagination)
    let countQuery = supabase
      .from('ideas')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    if (status) {
      countQuery = countQuery.eq('status', status)
    }
    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,body.ilike.%${search}%`)
    }
    if (tagMatchedIdeaIds !== null) {
      countQuery = countQuery.in('id', tagMatchedIdeaIds)
    }

    const { count } = await countQuery
    const total = count || 0

    // Build data query
    let query = supabase
      .from('ideas')
      .select('*')
      .eq('project_id', projectId)

    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`)
    }
    if (tagMatchedIdeaIds !== null) {
      query = query.in('id', tagMatchedIdeaIds)
    }

    // Sort
    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      newest: { column: 'created_at', ascending: false },
      oldest: { column: 'created_at', ascending: true },
      updated: { column: 'updated_at', ascending: false },
      az: { column: 'title', ascending: true },
      za: { column: 'title', ascending: false },
    }
    const sortCfg = sortMap[sort] || sortMap.newest
    query = query.order(sortCfg.column, { ascending: sortCfg.ascending })

    // Paginate
    query = query.range(offset, offset + limit - 1)

    const { data: rawIdeas, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching ideas:', queryError)
      return Response.json({ error: 'Failed to fetch ideas' }, { status: 500 })
    }

    const ideas = rawIdeas || []

    // Enrich with tags and creator profiles
    if (ideas.length === 0) {
      return Response.json({ ideas: [], total, hasMore: false })
    }

    const ideaIds = ideas.map((i) => i.id)

    // Batch-fetch idea_tags + tags
    const { data: ideaTagRows } = await supabase
      .from('idea_tags')
      .select('idea_id, tag_id')
      .in('idea_id', ideaIds)

    const tagsByIdeaId: Record<string, { id: string; name: string; color: string }[]> = {}

    if (ideaTagRows && ideaTagRows.length > 0) {
      const tagIds = [...new Set(ideaTagRows.map((it) => it.tag_id))]
      const { data: tags } = await supabase
        .from('tags')
        .select('id, name, color')
        .in('id', tagIds)

      const tagsMap = new Map(tags?.map((t) => [t.id, t]) || [])

      for (const it of ideaTagRows) {
        const tag = tagsMap.get(it.tag_id)
        if (tag) {
          if (!tagsByIdeaId[it.idea_id]) tagsByIdeaId[it.idea_id] = []
          tagsByIdeaId[it.idea_id].push(tag)
        }
      }
    }

    // Batch-fetch creator profiles
    const creatorIds = [...new Set(ideas.map((i) => i.created_by))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', creatorIds)

    const profilesMap = new Map(
      profiles?.map((p) => [
        p.id,
        { display_name: p.display_name, avatar_url: p.avatar_url },
      ]) || []
    )

    const enrichedIdeas = ideas.map((idea) => ({
      ...idea,
      tags: tagsByIdeaId[idea.id] || [],
      creator: profilesMap.get(idea.created_by) || null,
    }))

    return Response.json({
      ideas: enrichedIdeas,
      total,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}

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
