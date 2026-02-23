'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Tag,
  Archive,
  Trash2,
  ChevronDown,
  Plus,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast-container'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CATEGORY_CONFIG } from '@/components/lab/category-badge'
import type { FeedbackCategory } from '@/types/database'

interface BulkActionsBarProps {
  projectId: string
  selectedIds: string[]
  onClear: () => void
  onActionComplete: () => void
}

export function BulkActionsBar({
  projectId,
  selectedIds,
  onClear,
  onActionComplete,
}: BulkActionsBarProps) {
  const { addToast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const count = selectedIds.length

  // Fetch tag suggestions when tag dropdown opens
  useEffect(() => {
    if (!tagOpen) return
    async function fetchTags() {
      try {
        const res = await fetch(`/api/projects/${projectId}/feedback/tags`)
        if (res.ok) {
          const data = await res.json()
          setTagSuggestions(data.tags || [])
        }
      } catch {
        // ignore
      }
    }
    fetchTags()
  }, [tagOpen, projectId])

  const executeBulk = useCallback(
    async (operation: string, data?: Record<string, unknown>) => {
      setIsProcessing(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/feedback/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds, operation, data }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Bulk operation failed')
        }
        return true
      } catch (err) {
        addToast(
          err instanceof Error ? err.message : 'Bulk operation failed',
          'error'
        )
        return false
      } finally {
        setIsProcessing(false)
      }
    },
    [projectId, selectedIds, addToast]
  )

  const handleCategorize = useCallback(
    async (category: FeedbackCategory) => {
      setCategoryOpen(false)
      const success = await executeBulk('categorize', { category })
      if (success) {
        const label = CATEGORY_CONFIG[category]?.label || category
        addToast(
          `Categorized ${count} item${count !== 1 ? 's' : ''} as ${label}`,
          'success'
        )
        onActionComplete()
      }
    },
    [executeBulk, count, addToast, onActionComplete]
  )

  const handleAddTag = useCallback(
    async (tag: string) => {
      const trimmed = tag.trim().toLowerCase()
      if (!trimmed || trimmed.length < 2) return
      setTagOpen(false)
      setTagInput('')
      const success = await executeBulk('add_tags', { tags: [trimmed] })
      if (success) {
        addToast(
          `Added tag "${trimmed}" to ${count} item${count !== 1 ? 's' : ''}`,
          'success'
        )
        onActionComplete()
      }
    },
    [executeBulk, count, addToast, onActionComplete]
  )

  const handleArchive = useCallback(async () => {
    setArchiveDialogOpen(false)
    const success = await executeBulk('archive')
    if (success) {
      addToast(
        `Archived ${count} item${count !== 1 ? 's' : ''}`,
        'success'
      )
      onActionComplete()
    }
  }, [executeBulk, count, addToast, onActionComplete])

  const handleDelete = useCallback(async () => {
    setDeleteDialogOpen(false)
    const success = await executeBulk('delete')
    if (success) {
      addToast(
        `Deleted ${count} item${count !== 1 ? 's' : ''}`,
        'success'
      )
      onActionComplete()
    }
  }, [executeBulk, count, addToast, onActionComplete])

  const filteredSuggestions = tagSuggestions.filter(
    (t) => t.toLowerCase().includes(tagInput.toLowerCase()) && tagInput.length >= 1
  )

  return (
    <>
      {/* Floating action bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-bg-secondary border border-border-default rounded-lg shadow-xl px-4 py-2.5 flex items-center gap-3">
        {/* Selection count */}
        <span className="text-xs font-medium text-text-primary whitespace-nowrap">
          {count} selected
        </span>

        <div className="w-px h-5 bg-border-default" />

        {/* Categorize dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setCategoryOpen(!categoryOpen)
              setTagOpen(false)
            }}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
          >
            Categorize
            <ChevronDown className="w-3 h-3" />
          </button>

          {categoryOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setCategoryOpen(false)}
              />
              <div className="absolute bottom-full left-0 mb-1 z-20 bg-bg-secondary border border-border-default rounded-lg shadow-lg py-1 min-w-[160px]">
                {(
                  Object.keys(CATEGORY_CONFIG) as FeedbackCategory[]
                ).map((key) => {
                  const config = CATEGORY_CONFIG[key]
                  const Icon = config.icon
                  return (
                    <button
                      key={key}
                      onClick={() => handleCategorize(key)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {config.label}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Tag dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setTagOpen(!tagOpen)
              setCategoryOpen(false)
              setTimeout(() => tagInputRef.current?.focus(), 50)
            }}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
          >
            <Tag className="w-3 h-3" />
            Tag
          </button>

          {tagOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setTagOpen(false)}
              />
              <div className="absolute bottom-full left-0 mb-1 z-20 bg-bg-secondary border border-border-default rounded-lg shadow-lg p-2 min-w-[200px]">
                <div className="flex items-center gap-1">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.stopPropagation()
                        handleAddTag(tagInput)
                      }
                      if (e.key === 'Escape') {
                        e.stopPropagation()
                        setTagOpen(false)
                      }
                    }}
                    placeholder="Type a tag..."
                    className="flex-1 bg-bg-tertiary border border-border-default rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-cyan"
                  />
                  <button
                    onClick={() => handleAddTag(tagInput)}
                    disabled={!tagInput.trim() || tagInput.trim().length < 2}
                    className="p-1 rounded text-accent-cyan hover:bg-accent-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {filteredSuggestions.length > 0 && (
                  <div className="mt-1.5 max-h-[120px] overflow-y-auto">
                    {filteredSuggestions.slice(0, 8).map((tagName) => (
                      <button
                        key={tagName}
                        onClick={() => handleAddTag(tagName)}
                        className="w-full text-left px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        {tagName}
                      </button>
                    ))}
                  </div>
                )}

                {tagInput.length >= 2 && filteredSuggestions.length === 0 && (
                  <p className="mt-1 px-2 text-[10px] text-text-tertiary">
                    Press Enter to add &ldquo;{tagInput.trim()}&rdquo;
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Archive */}
        <button
          onClick={() => setArchiveDialogOpen(true)}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-text-secondary hover:text-accent-warning hover:bg-accent-warning/10 transition-colors disabled:opacity-50"
        >
          <Archive className="w-3 h-3" />
          Archive
        </button>

        {/* Delete */}
        <button
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-accent-error/70 hover:text-accent-error hover:bg-accent-error/10 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>

        <div className="w-px h-5 bg-border-default" />

        {/* Clear selection */}
        <button
          onClick={onClear}
          className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title="Clear selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Archive confirmation dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Archive {count} item{count !== 1 ? 's' : ''}?
            </DialogTitle>
            <DialogClose onClick={() => setArchiveDialogOpen(false)} />
          </DialogHeader>
          <DialogBody>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-warning/10 flex items-center justify-center flex-shrink-0">
                <Archive className="w-5 h-5 text-accent-warning" />
              </div>
              <p className="text-sm text-text-secondary">
                These items will be marked as archived. You can restore them
                later by changing their status.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setArchiveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleArchive}
              isLoading={isProcessing}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {count} item{count !== 1 ? 's' : ''} permanently?
            </DialogTitle>
            <DialogClose onClick={() => setDeleteDialogOpen(false)} />
          </DialogHeader>
          <DialogBody>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-error/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-accent-error" />
              </div>
              <p className="text-sm text-text-secondary">
                This action cannot be undone. These feedback items will be
                permanently removed.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={isProcessing}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
