'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Plus, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-container'
import type { IdeaWithDetails } from './types'
import type { Tag, IdeaStatus } from '@/types/database'

interface NewTagEntry {
  name: string
  color: string
}

const TITLE_MAX = 200
const BODY_MAX = 3000
const DEFAULT_TAG_COLOR = '#808080'
const AUTOSAVE_DELAY = 1000

// Status advancement order (forward-only)
const STATUS_ORDER: IdeaStatus[] = ['raw', 'developing', 'mature']

interface IdeaEditFormProps {
  idea: IdeaWithDetails
  projectId: string
  onCancel: () => void
  onSaved: (updatedIdea: IdeaWithDetails) => void
}

export function IdeaEditForm({ idea, projectId, onCancel, onSaved }: IdeaEditFormProps) {
  // Form state
  const [title, setTitle] = useState(idea.title)
  const [body, setBody] = useState(idea.body || '')
  const [status, setStatus] = useState<IdeaStatus>(idea.status)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    idea.tags.map((t) => t.id)
  )
  const [newTags, setNewTags] = useState<NewTagEntry[]>([])

  // Tag management
  const [projectTags, setProjectTags] = useState<Tag[]>([])
  const [tagSearch, setTagSearch] = useState('')
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR)
  const [tagsLoading, setTagsLoading] = useState(false)

  // Save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Track last saved state for dirty checking
  const lastSavedRef = useRef({
    title: idea.title,
    body: idea.body || '',
    status: idea.status,
    tagIds: idea.tags.map((t) => t.id).sort().join(','),
  })

  // Autosave timer
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const titleRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()

  // Fetch project tags
  useEffect(() => {
    async function fetchTags() {
      setTagsLoading(true)
      try {
        const res = await fetch(`/api/hall/tags?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          setProjectTags(data)
        }
      } catch {
        // Not critical
      } finally {
        setTagsLoading(false)
      }
    }
    fetchTags()
  }, [projectId])

  // Autofocus title
  useEffect(() => {
    const timer = setTimeout(() => titleRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  const isDirty = useCallback(() => {
    const saved = lastSavedRef.current
    return (
      title.trim() !== saved.title ||
      body.trim() !== saved.body ||
      status !== saved.status ||
      selectedTagIds.sort().join(',') !== saved.tagIds ||
      newTags.length > 0
    )
  }, [title, body, status, selectedTagIds, newTags])

  const performSave = useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrors({ title: 'Title is required' })
      setSaveStatus('error')
      return false
    }
    if (trimmedTitle.length > TITLE_MAX) {
      setErrors({ title: `Title must be ${TITLE_MAX} characters or less` })
      setSaveStatus('error')
      return false
    }
    if (body.length > BODY_MAX) {
      setErrors({ body: `Description must be ${BODY_MAX} characters or less` })
      setSaveStatus('error')
      return false
    }

    setErrors({})
    setSaveStatus('saving')
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/hall/ideas/${idea.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          body: body.trim() || null,
          status,
          tagIds: selectedTagIds,
          newTags,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.errors) {
          setErrors(data.errors)
        } else {
          setErrors({ form: data.error || 'Failed to save' })
        }
        setSaveStatus('error')
        return false
      }

      const updatedIdea = await res.json()

      // Update last saved reference
      lastSavedRef.current = {
        title: updatedIdea.title,
        body: updatedIdea.body || '',
        status: updatedIdea.status,
        tagIds: updatedIdea.tags.map((t: { id: string }) => t.id).sort().join(','),
      }

      // Clear new tags since they're now saved
      setNewTags([])
      // Update selectedTagIds to match server response
      setSelectedTagIds(updatedIdea.tags.map((t: { id: string }) => t.id))
      // Refresh project tags in case new ones were created
      if (newTags.length > 0) {
        const tagsRes = await fetch(`/api/hall/tags?projectId=${projectId}`)
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json()
          setProjectTags(tagsData)
        }
      }

      setSaveStatus('saved')
      onSaved(updatedIdea)

      // Clear saved indicator after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000)
      return true
    } catch {
      setErrors({ form: 'Failed to save. Please try again.' })
      setSaveStatus('error')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [title, body, status, selectedTagIds, newTags, idea.id, projectId, onSaved])

  // Schedule autosave
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = setTimeout(() => {
      performSave()
    }, AUTOSAVE_DELAY)
  }, [performSave])

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (errors.title && value.trim()) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.title
        return next
      })
    }
    setSaveStatus('idle')
    scheduleAutoSave()
  }

  const handleBodyChange = (value: string) => {
    setBody(value)
    if (errors.body) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.body
        return next
      })
    }
    setSaveStatus('idle')
    scheduleAutoSave()
  }

  const handleStatusChange = (value: string) => {
    setStatus(value as IdeaStatus)
    setSaveStatus('idle')
    scheduleAutoSave()
  }

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
    setSaveStatus('idle')
    scheduleAutoSave()
  }

  const handleRemoveNewTag = (index: number) => {
    setNewTags((prev) => prev.filter((_, i) => i !== index))
    setSaveStatus('idle')
    scheduleAutoSave()
  }

  const handleCreateNewTag = () => {
    const name = tagSearch.trim()
    if (!name) return

    const alreadyExists =
      projectTags.some((t) => t.name.toLowerCase() === name.toLowerCase()) ||
      newTags.some((t) => t.name.toLowerCase() === name.toLowerCase())
    if (alreadyExists) return

    setNewTags((prev) => [...prev, { name, color: newTagColor }])
    setTagSearch('')
    setNewTagColor(DEFAULT_TAG_COLOR)
    setSaveStatus('idle')
    scheduleAutoSave()
  }

  const handleExplicitSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    const success = await performSave()
    if (success) {
      addToast('Changes saved', 'success')
    }
  }

  const handleCancel = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    if (isDirty() && saveStatus !== 'saved') {
      const confirmed = window.confirm('Discard unsaved changes?')
      if (!confirmed) return
    }

    onCancel()
  }

  // Available status options (can only advance, never go backwards)
  const currentStatusIdx = STATUS_ORDER.indexOf(idea.status)
  const isStatusLocked = idea.status === 'promoted' || idea.status === 'archived'

  // Filter tags by search
  const filteredTags = projectTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  )

  const showCreateOption =
    tagSearch.trim().length > 0 &&
    !projectTags.some(
      (t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase()
    ) &&
    !newTags.some(
      (t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase()
    )

  // All selected tags for display
  const selectedExistingTags = projectTags.filter((t) =>
    selectedTagIds.includes(t.id)
  )

  return (
    <form onSubmit={handleExplicitSave} className="p-6 space-y-5">
      {/* Save status indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Editing Idea
        </h3>
        <div className="flex items-center gap-1.5 text-xs">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-cyan" />
              <span className="text-text-secondary">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check className="w-3.5 h-3.5 text-accent-success" />
              <span className="text-accent-success">Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <span className="text-accent-error">Save failed</span>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="edit-idea-title"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Title <span className="text-accent-error">*</span>
        </label>
        <input
          ref={titleRef}
          id="edit-idea-title"
          type="text"
          maxLength={TITLE_MAX}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
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

      {/* Body */}
      <div>
        <label
          htmlFor="edit-idea-body"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Description{' '}
          <span className="text-text-tertiary font-normal">(optional)</span>
        </label>
        <textarea
          id="edit-idea-body"
          maxLength={BODY_MAX}
          value={body}
          onChange={(e) => handleBodyChange(e.target.value)}
          placeholder="Describe the idea, pain point, or use case..."
          rows={6}
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

      {/* Status */}
      {!isStatusLocked && (
        <div>
          <label
            htmlFor="edit-idea-status"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            Status
          </label>
          <select
            id="edit-idea-status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent disabled:opacity-50"
            disabled={isSubmitting}
          >
            {STATUS_ORDER.map((s, idx) => (
              <option key={s} value={s} disabled={idx < currentStatusIdx}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
                {idx < currentStatusIdx ? ' (cannot revert)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary mt-1">
            Status can only be advanced forward
          </p>
        </div>
      )}

      {/* Tags */}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                      disabled={isSubmitting}
                    >
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="truncate">{tag.name}</span>
                      {selectedTagIds.includes(tag.id) && (
                        <span className="ml-auto text-accent-cyan text-xs">
                          Selected
                        </span>
                      )}
                    </button>
                  )
                )}

                {tagSearch && filteredTags.length === 0 && !showCreateOption && (
                  <div className="p-3 text-xs text-text-tertiary text-center">
                    No tags found
                  </div>
                )}

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
                        disabled={isSubmitting}
                      >
                        <Plus className="w-3 h-3" />
                        Create
                      </button>
                    </div>
                  </div>
                )}

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
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          isLoading={isSubmitting}
        >
          Save Changes
        </Button>
      </div>
    </form>
  )
}
