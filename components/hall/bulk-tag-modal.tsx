'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Tag } from '@/types/database'

interface BulkTagModalProps {
  isOpen: boolean
  onClose: () => void
  projectTags: Tag[]
  selectedCount: number
  onConfirm: (tagIds: string[]) => Promise<void>
}

export function BulkTagModal({
  isOpen,
  onClose,
  projectTags,
  selectedCount,
  onConfirm,
}: BulkTagModalProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const filteredTags = projectTags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  )

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }

  async function handleConfirm() {
    if (selectedTagIds.size === 0) return
    setIsLoading(true)
    try {
      await onConfirm(Array.from(selectedTagIds))
      setSelectedTagIds(new Set())
      setSearch('')
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
    setSelectedTagIds(new Set())
    setSearch('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-lg font-semibold text-text-primary">
            Tag {selectedCount} {selectedCount === 1 ? 'idea' : 'ideas'}
          </h2>
        </DialogHeader>

        <DialogBody>
          <p className="text-sm text-text-secondary mb-3">
            Select tags to add. Existing tags on ideas will be preserved.
          </p>

          {projectTags.length > 5 && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags..."
              className="w-full mb-3 px-3 py-1.5 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
            />
          )}

          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredTags.length === 0 ? (
              <p className="text-sm text-text-tertiary py-2">
                {projectTags.length === 0 ? 'No tags in this project' : 'No tags match search'}
              </p>
            ) : (
              filteredTags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-tertiary/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTagIds.has(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                    className="w-3.5 h-3.5 rounded border-border-default accent-accent-cyan"
                  />
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm text-text-primary">{tag.name}</span>
                </label>
              ))
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={selectedTagIds.size === 0}
          >
            Apply Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
