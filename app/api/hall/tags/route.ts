import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const includeUsage = searchParams.get('includeUsage') === 'true'

    if (!projectId) {
      return Response.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
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
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    // Fetch all tags for this project
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching tags:', error)
      return Response.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      )
    }

    if (!includeUsage) {
      return Response.json(tags || [])
    }

    // Fetch usage counts for each tag
    const tagIds = (tags || []).map((t) => t.id)
    const { data: ideaTags } = await supabase
      .from('idea_tags')
      .select('tag_id')
      .in('tag_id', tagIds.length > 0 ? tagIds : ['__none__'])

    const usageMap: Record<string, number> = {}
    for (const it of ideaTags || []) {
      usageMap[it.tag_id] = (usageMap[it.tag_id] || 0) + 1
    }

    const tagsWithUsage = (tags || []).map((tag) => ({
      ...tag,
      usage_count: usageMap[tag.id] || 0,
    }))

    return Response.json(tagsWithUsage)
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { projectId, name, color } = await request.json()

    if (!projectId || !name?.trim()) {
      return Response.json(
        { error: 'Project ID and tag name are required' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()
    if (trimmedName.length > 30) {
      return Response.json(
        { error: 'Tag name must be 30 characters or less' },
        { status: 400 }
      )
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
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    // Check for duplicate tag name in project
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('project_id', projectId)
      .ilike('name', trimmedName)
      .single()

    if (existing) {
      return Response.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      )
    }

    // Create the tag
    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        project_id: projectId,
        name: trimmedName,
        color: color || '#808080',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating tag:', error)
      return Response.json(
        { error: 'Failed to create tag' },
        { status: 500 }
      )
    }

    return Response.json({ ...tag, usage_count: 0 }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
