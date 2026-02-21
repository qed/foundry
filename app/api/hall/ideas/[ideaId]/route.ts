import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

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

    // Fetch tags for this idea
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

    return Response.json({
      ...idea,
      tags,
      creator: profile
        ? { display_name: profile.display_name, avatar_url: profile.avatar_url }
        : null,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
