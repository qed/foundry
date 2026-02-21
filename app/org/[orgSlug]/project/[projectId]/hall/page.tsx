import { createClient } from '@/lib/supabase/server'
import { HallClient } from '@/components/hall/hall-client'
import type { IdeaWithDetails } from '@/components/hall/types'

const PAGE_SIZE = 12

interface HallPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function HallPage({ params }: HallPageProps) {
  const { orgSlug, projectId } = await params
  const supabase = await createClient()

  // Fetch project tags (for filter dropdown)
  const { data: projectTags } = await supabase
    .from('tags')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  // Fetch total count
  const { count } = await supabase
    .from('ideas')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const total = count || 0

  // Fetch first page of ideas (newest first, no filters — matches default UI state)
  const { data: rawIdeas } = await supabase
    .from('ideas')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1)

  const ideas = rawIdeas || []

  // Enrich with tags and creator profiles
  let ideasWithDetails: IdeaWithDetails[] = []

  if (ideas.length > 0) {
    const ideaIds = ideas.map((i) => i.id)

    // Fetch idea_tags + tags
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

    // Fetch creator profiles
    const creatorIds = [...new Set(ideas.map((i) => i.created_by))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', creatorIds)

    const profilesMap = new Map(
      profiles?.map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]) || []
    )

    // Combine
    ideasWithDetails = ideas.map((idea) => ({
      ...idea,
      tags: tagsByIdeaId[idea.id] || [],
      creator: profilesMap.get(idea.created_by) || null,
    }))
  }

  return (
    <HallClient
      initialIdeas={ideasWithDetails}
      initialTotal={total}
      initialHasMore={total > PAGE_SIZE}
      projectId={projectId}
      orgSlug={orgSlug}
      initialTags={projectTags || []}
    />
  )
}
