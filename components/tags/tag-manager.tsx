'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Search,
  X,
  Pencil,
  Trash2,
  Tags,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast-container'
import { TagEditorModal } from './tag-editor-modal'
import { TagDeleteModal } from './tag-delete-modal'

export interface TagWithUsage {
  id: string
  name: string
  color: string
  project_id: string
  created_at: string
  usage_count: number
}

type SortOption = 'name-asc' | 'name-desc' | 'usage-desc' | 'usage-asc' | 'newest'

interface TagManagerProps {
  initialTags: TagWithUsage[]
  projectId: string
  orgSlug: string
}

export function TagManager({
  initialTags,
  projectId,
  orgSlug,
}: TagManagerProps) {
  const router = useRouter()
  const { addToast } = useToast()

  const [tags, setTags] = useState<TagWithUsage[]>(initialTags)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTag, setEditingTag] = useState<TagWithUsage | null>(null)
  const [deletingTag, setDeletingTag] = useState<TagWithUsage | null>(null)

  // Filter and sort tags
  const filteredTags = useMemo(() => {
    const result = tags.filter((tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'usage-desc':
          return b.usage_count - a.usage_count || a.name.localeCompare(b.name)
        case 'usage-asc':
          return a.usage_count - b.usage_count || a.name.localeCompare(b.name)
        case 'newest':
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          )
        default:
          return 0
      }
    })

    return result
  }, [tags, searchQuery, sortBy])

  const handleTagSaved = useCallback(
    (savedTag: TagWithUsage) => {
      setTags((prev) => {
        const exists = prev.find((t) => t.id === savedTag.id)
        if (exists) {
          return prev.map((t) => (t.id === savedTag.id ? savedTag : t))
        }
        return [...prev, savedTag]
      })
      addToast(
        editingTag ? 'Tag updated' : 'Tag created',
        'success'
      )
    },
    [addToast, editingTag]
  )

  const handleTagDeleted = useCallback(
    (tagId: string, mergedIntoId?: string) => {
      setTags((prev) => {
        let next = prev.filter((t) => t.id !== tagId)

        // If merged, update the target tag's usage count
        if (mergedIntoId) {
          const deletedTag = prev.find((t) => t.id === tagId)
          next = next.map((t) => {
            if (t.id === mergedIntoId && deletedTag) {
              return {
                ...t,
                usage_count: t.usage_count + deletedTag.usage_count,
              }
            }
            return t
          })
        }

        return next
      })

      addToast(
        mergedIntoId
          ? 'Tag merged and deleted'
          : 'Tag deleted',
        'success'
      )
    },
    [addToast]
  )

  // Get back URL
  const projectPath = `/org/${orgSlug}/project/${projectId}`

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`${projectPath}/hall`)}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Hall
        </button>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary">
              Manage Tags
            </h1>
            <p className="text-sm text-text-tertiary mt-0.5">
              Organize your ideas with custom tags and colors
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>+ New Tag</Button>
        </div>
      </div>

      {/* Search and Sort */}
      {tags.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full pl-10 pr-9 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="usage-desc">Most used</option>
            <option value="usage-asc">Least used</option>
            <option value="newest">Recently created</option>
          </select>
        </div>
      )}

      {/* Tag count */}
      {tags.length > 0 && searchQuery && (
        <p className="text-sm text-text-tertiary mb-4">
          {filteredTags.length} of {tags.length} tags
        </p>
      )}

      {/* Tag List or Empty State */}
      {tags.length === 0 ? (
        <EmptyState
          icon={<Tags className="w-12 h-12" />}
          title="No tags yet"
          description="Tags help you organize and categorize your ideas. Create your first tag to get started."
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              Create your first tag
            </Button>
          }
        />
      ) : filteredTags.length === 0 ? (
        <EmptyState
          title="No tags match your search"
          description="Try a different search term"
          action={
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="glass-panel p-4 rounded-lg border border-border-default hover:border-border-default/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 border border-border-default"
                  style={{ backgroundColor: tag.color }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-text-primary truncate">
                    {tag.name}
                  </h3>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {tag.usage_count}{' '}
                    {tag.usage_count === 1 ? 'idea' : 'ideas'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setEditingTag(tag)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                    'border border-border-default text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  )}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setDeletingTag(tag)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                    'border border-accent-error/30 text-accent-error hover:bg-accent-error/10'
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <TagEditorModal
        isOpen={showCreateModal || !!editingTag}
        onClose={() => {
          setShowCreateModal(false)
          setEditingTag(null)
        }}
        projectId={projectId}
        tag={editingTag}
        onTagSaved={handleTagSaved}
      />

      {/* Delete Modal */}
      <TagDeleteModal
        isOpen={!!deletingTag}
        onClose={() => setDeletingTag(null)}
        tag={deletingTag}
        otherTags={tags.filter((t) => t.id !== deletingTag?.id)}
        onDeleted={handleTagDeleted}
      />
    </div>
  )
}
