'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface TagWithUsage {
  id: string
  name: string
  color: string
  project_id: string
  created_at: string
  usage_count: number
}

interface TagDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  tag: TagWithUsage | null
  otherTags: TagWithUsage[]
  onDeleted: (tagId: string, mergedIntoId?: string) => void
}

export function TagDeleteModal({
  isOpen,
  onClose,
  tag,
  otherTags,
  onDeleted,
}: TagDeleteModalProps) {
  const [mode, setMode] = useState<'remove' | 'merge'>('remove')
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  if (!tag) return null

  const hasUsage = tag.usage_count > 0

  const handleDelete = async () => {
    setIsDeleting(true)
    setError('')

    try {
      if (mode === 'merge' && mergeTargetId) {
        // Merge into target tag
        const res = await fetch(`/api/hall/tags/${tag.id}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetTagId: mergeTargetId }),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to merge tag')
          return
        }

        onDeleted(tag.id, mergeTargetId)
      } else {
        // Delete without merge
        const res = await fetch(`/api/hall/tags/${tag.id}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to delete tag')
          return
        }

        onDeleted(tag.id)
      }

      onClose()
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setMode('remove')
      setMergeTargetId('')
      setError('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-accent-error" />
            Delete Tag
          </DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Tag preview */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Deleting:</span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </span>
          </div>

          {hasUsage ? (
            <>
              <p className="text-sm text-text-secondary">
                This tag is used by{' '}
                <span className="font-semibold text-text-primary">
                  {tag.usage_count} {tag.usage_count === 1 ? 'idea' : 'ideas'}
                </span>
                . What would you like to do?
              </p>

              {/* Options */}
              <div className="space-y-3">
                {/* Remove from all */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-border-default hover:bg-bg-tertiary/50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="delete-mode"
                    value="remove"
                    checked={mode === 'remove'}
                    onChange={() => setMode('remove')}
                    className="mt-0.5 accent-accent-cyan"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Remove tag from all ideas
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      The tag will be deleted and removed from{' '}
                      {tag.usage_count}{' '}
                      {tag.usage_count === 1 ? 'idea' : 'ideas'}
                    </p>
                  </div>
                </label>

                {/* Merge into another tag */}
                {otherTags.length > 0 && (
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border-default hover:bg-bg-tertiary/50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="delete-mode"
                      value="merge"
                      checked={mode === 'merge'}
                      onChange={() => setMode('merge')}
                      className="mt-0.5 accent-accent-cyan"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        Merge into another tag
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5 mb-2">
                        Move all ideas to a different tag, then delete this one
                      </p>

                      {mode === 'merge' && (
                        <select
                          value={mergeTargetId}
                          onChange={(e) => setMergeTargetId(e.target.value)}
                          className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                        >
                          <option value="">Select a tag...</option>
                          {otherTags.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.usage_count}{' '}
                              {t.usage_count === 1 ? 'idea' : 'ideas'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-text-secondary">
              This tag is not used by any ideas. Are you sure you want to delete
              it?
            </p>
          )}

          {error && (
            <div className="p-3 bg-accent-error/10 border border-accent-error/30 rounded-lg">
              <p className="text-sm text-accent-error">{error}</p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleting || (mode === 'merge' && !mergeTargetId)}
            isLoading={isDeleting}
          >
            {mode === 'merge' ? 'Merge & Delete' : 'Delete Tag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
