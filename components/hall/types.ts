import type { Idea, IdeaStatus } from '@/types/database'

export type IdeaWithDetails = Idea & {
  tags: { id: string; name: string; color: string }[]
  creator: { display_name: string | null; avatar_url: string | null } | null
}

export const STATUS_CONFIG: Record<
  IdeaStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'purple' | 'outline'
  }
> = {
  raw: { label: 'Raw', variant: 'secondary' },
  developing: { label: 'Developing', variant: 'purple' },
  mature: { label: 'Mature', variant: 'success' },
  promoted: { label: 'Promoted', variant: 'default' },
  archived: { label: 'Archived', variant: 'outline' },
}

export const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'raw', label: 'Raw' },
  { value: 'developing', label: 'Developing' },
  { value: 'mature', label: 'Mature' },
  { value: 'promoted', label: 'Promoted' },
  { value: 'archived', label: 'Archived' },
]

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'az', label: 'A → Z' },
  { value: 'za', label: 'Z → A' },
]

export type SortOption = 'newest' | 'oldest' | 'updated' | 'az' | 'za'
