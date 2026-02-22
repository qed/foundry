'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-container'
import type { Tag } from '@/types/database'

interface IdeaCreateModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onIdeaCreated?: () => void
}

interface NewTagEntry {
  name: string
  color: string
}

const TITLE_MAX = 200
const BODY_MAX = 3000
const DEFAULT_TAG_COLOR = '#808080'

export function IdeaCreateModal({
  isOpen,
  onClose,
  projectId,
  onIdeaCreated,
}: IdeaCreateModalProps) {
  // Form state
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTags, setNewTags] = useState<NewTagEntry[]>([])

  // Tag management
  const [projectTags, setProjectTags] = useState<Tag[]>([])
  const [tagSearch, setTagSearch] = useState('')
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR)
  const [tagsLoading, setTagsLoading] = useState(false)

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()

  // Fetch project tags when modal opens
  useEffect(() => {
    if (!isOpen) return

    async function fetchTags() {
      setTagsLoading(true)
      try {
        const res = await fetch(`/api/hall/tags?projectId=${projectId}&includeUsage=true`)
        if (res.ok) {
          const data = await res.json()
          setProjectTags(data)
        }
      } catch {
        // Tags fetch failed — not critical, user can still create new ones
      } finally {
        setTagsLoading(false)
      }
    }

    fetchTags()
  }, [isOpen, projectId])

  // Autofocus title when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the modal render
      const timer = setTimeout(() => titleRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Track dirty state
  useEffect(() => {
    setIsDirty(
      title.length > 0 ||
        body.length > 0 ||
        selectedTagIds.length > 0 ||
        newTags.length > 0
    )
  }, [title, body, selectedTagIds, newTags])

  const resetForm = useCallback(() => {
    setTitle('')
    setBody('')
    setSelectedTagIds([])
    setNewTags([])
    setTagSearch('')
    setNewTagColor(DEFAULT_TAG_COLOR)
    setErrors({})
    setIsDirty(false)
  }, [])

  const handleClose = useCallback(() => {
    if (isDirty && !isSubmitting) {
      const confirmed = window.confirm('Discard changes?')
      if (!confirmed) return
    }
    resetForm()
    onClose()
  }, [isDirty, isSubmitting, resetForm, onClose])

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleRemoveNewTag = (index: number) => {
    setNewTags((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreateNewTag = () => {
    const name = tagSearch.trim()
    if (!name) return

    // Prevent duplicates
    const alreadyExists =
      projectTags.some((t) => t.name.toLowerCase() === name.toLowerCase()) ||
      newTags.some((t) => t.name.toLowerCase() === name.toLowerCase())
    if (alreadyExists) return

    setNewTags((prev) => [...prev, { name, color: newTagColor }])
    setTagSearch('')
    setNewTagColor(DEFAULT_TAG_COLOR)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrors({ title: 'Title is required' })
      return
    }
    if (trimmedTitle.length > TITLE_MAX) {
      setErrors({ title: `Title must be ${TITLE_MAX} characters or less` })
      return
    }
    if (body.length > BODY_MAX) {
      setErrors({ body: `Description must be ${BODY_MAX} characters or less` })
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/hall/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: trimmedTitle,
          body: body.trim() || null,
          tagIds: selectedTagIds,
          newTags,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.errors) {
          setErrors(data.errors)
        } else {
          setErrors({ form: data.error || 'Failed to create idea' })
        }
        addToast('Failed to create idea. Please try again.', 'error')
        return
      }

      addToast('Idea created!', 'success')
      resetForm()
      onClose()
      onIdeaCreated?.()
    } catch {
      setErrors({ form: 'An error occurred. Please try again.' })
      addToast('Failed to create idea. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter tags by search
  const filteredTags = projectTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  )

  // Show "create new tag" option when search doesn't match any existing tag
  const showCreateOption =
    tagSearch.trim().length > 0 &&
    !projectTags.some(
      (t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase()
    ) &&
    !newTags.some(
      (t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase()
    )

  // All selected tags (existing + new) for display
  const selectedExistingTags = projectTags.filter((t) =>
    selectedTagIds.includes(t.id)
  )

  const canSubmit = title.trim().length > 0 && !isSubmitting

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'relative bg-bg-secondary border border-border-default shadow-xl',
          'w-full max-h-full overflow-y-auto',
          // Desktop: centered modal
          'md:max-w-[600px] md:rounded-lg md:max-h-[85vh]',
          // Mobile: full screen
          'h-full md:h-auto'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 md:p-6 border-b border-border-default bg-bg-secondary">
          <h2 className="text-lg font-semibold text-text-primary">New Idea</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary hover:text-text-primary"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-5">
          {/* Title Input */}
          <div>
            <label
              htmlFor="idea-title"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Idea Title <span className="text-accent-error">*</span>
            </label>
            <input
              ref={titleRef}
              id="idea-title"
              type="text"
              maxLength={TITLE_MAX}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (errors.title && e.target.value.trim()) {
                  setErrors((prev) => {
                    const next = { ...prev }
                    delete next.title
                    return next
                  })
                }
              }}
              placeholder="What's the idea?"
              className={cn(
                'w-full px-3 py-2 bg-bg-primary border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary',
                'focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent',
                'disabled:opacity-50',
                errors.title ? 'border-accent-error' : 'border-border-default'
              )}
              disabled={isSubmitting}
            />
            <div className="flex justify-between mt-1">
              {errors.title && (
                <span className="text-xs text-accent-error">{errors.title}</span>
              )}
              <span className="text-xs text-text-tertiary ml-auto">
                {title.length}/{TITLE_MAX}
              </span>
            </div>
          </div>

          {/* Body / Description */}
          <div>
            <label
              htmlFor="idea-body"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Description{' '}
              <span className="text-text-tertiary font-normal">(optional)</span>
            </label>
            <textarea
              id="idea-body"
              maxLength={BODY_MAX}
              value={body}
              onChange={(e) => {
                setBody(e.target.value)
                if (errors.body) {
                  setErrors((prev) => {
                    const next = { ...prev }
                    delete next.body
                    return next
                  })
                }
              }}
              placeholder="Describe the idea, pain point, or use case..."
              rows={5}
              className={cn(
                'w-full px-3 py-2 bg-bg-primary border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary resize-y',
                'focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent',
                'disabled:opacity-50 min-h-[120px] max-h-[300px]',
                errors.body ? 'border-accent-error' : 'border-border-default'
              )}
              disabled={isSubmitting}
            />
            <div className="flex justify-between mt-1">
              {errors.body && (
                <span className="text-xs text-accent-error">{errors.body}</span>
              )}
              <span className="text-xs text-text-tertiary ml-auto">
                {body.length}/{BODY_MAX}
              </span>
            </div>
          </div>

          {/* Tags Section */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Tags
            </label>

            {/* Selected tags pills */}
            {(selectedExistingTags.length > 0 || newTags.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedExistingTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className="hover:opacity-70"
                      aria-label={`Remove ${tag.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {newTags.map((tag, idx) => (
                  <span
                    key={`new-${idx}`}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                    <span className="text-[10px] opacity-60">(new)</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewTag(idx)}
                      className="hover:opacity-70"
                      aria-label={`Remove ${tag.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search or create tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent disabled:opacity-50"
                disabled={isSubmitting}
              />
            </div>

            {/* Tag dropdown */}
            {(tagSearch || (!tagSearch && projectTags.length > 0)) && (
              <div className="mt-1.5 max-h-40 overflow-y-auto border border-border-default rounded-lg bg-bg-primary">
                {tagsLoading ? (
                  <div className="p-3 text-xs text-text-tertiary text-center">
                    Loading tags...
                  </div>
                ) : (
                  <>
                    {/* Existing tags list */}
                    {(tagSearch ? filteredTags : projectTags.slice(0, 8)).map(
                      (tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleTag(tag.id)}
                          className={cn(
                            'w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2',
                            selectedTagIds.includes(tag.id)
                              ? 'bg-bg-tertiary text-text-primary font-medium'
                              : 'text-text-secondary hover:bg-bg-secondary'
                          )}
                        >
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="truncate">{tag.name}</span>
                          {'usage_count' in tag && (
                            <span className="text-text-tertiary text-xs">
                              ({(tag as Tag & { usage_count?: number }).usage_count || 0})
                            </span>
                          )}
                          {selectedTagIds.includes(tag.id) && (
                            <span className="ml-auto text-accent-cyan text-xs">
                              Selected
                            </span>
                          )}
                        </button>
                      )
                    )}

                    {/* No existing tags matching */}
                    {tagSearch && filteredTags.length === 0 && !showCreateOption && (
                      <div className="p-3 text-xs text-text-tertiary text-center">
                        No tags found
                      </div>
                    )}

                    {/* Create new tag option */}
                    {showCreateOption && (
                      <div className="border-t border-border-default p-3">
                        <p className="text-xs text-text-secondary mb-2">
                          Create tag &ldquo;{tagSearch.trim()}&rdquo;
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newTagColor}
                            onChange={(e) => setNewTagColor(e.target.value)}
                            className="w-8 h-8 rounded border border-border-default cursor-pointer bg-transparent"
                            title="Tag color"
                          />
                          <button
                            type="button"
                            onClick={handleCreateNewTag}
                            className="flex items-center gap-1 px-3 py-1.5 bg-accent-cyan text-bg-primary text-xs font-medium rounded-lg hover:bg-accent-cyan/80 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Create
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Empty state for no tags at all */}
                    {!tagSearch && projectTags.length === 0 && !tagsLoading && (
                      <div className="p-3 text-xs text-text-tertiary text-center">
                        No tags yet — type to create one
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Form-level error */}
          {errors.form && (
            <div className="p-3 bg-accent-error/10 border border-accent-error/30 rounded-lg">
              <p className="text-sm text-accent-error">{errors.form}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border-default">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              isLoading={isSubmitting}
            >
              Create Idea
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
