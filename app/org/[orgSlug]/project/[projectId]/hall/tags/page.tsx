import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { TagManager } from '@/components/tags/tag-manager'

interface TagsPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function TagsPage({ params }: TagsPageProps) {
  const { orgSlug, projectId } = await params
  const user = await requireAuth()
  const supabase = createServiceClient()

  // Verify user belongs to project
  const { data: membership } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Not authorized for this project.
      </div>
    )
  }

  // Fetch tags with usage counts
  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  // Fetch usage counts
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

  return (
    <TagManager
      initialTags={tagsWithUsage}
      projectId={projectId}
      orgSlug={orgSlug}
    />
  )
}
