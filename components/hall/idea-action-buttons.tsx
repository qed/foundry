'use client'

import { useState } from 'react'
import { Pencil, Trash2, Zap, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import type { IdeaWithDetails } from './types'

interface IdeaActionButtonsProps {
  idea: IdeaWithDetails
  isEditing?: boolean
  onEdit?: () => void
  onArchive?: () => Promise<void>
  onPromote?: () => void
  orgSlug?: string
  projectId?: string
}

export function IdeaActionButtons({
  idea,
  isEditing,
  onEdit,
  onArchive,
  onPromote,
  orgSlug,
  projectId,
}: IdeaActionButtonsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const handleArchiveConfirm = async () => {
    if (!onArchive) return
    setIsArchiving(true)
    try {
      await onArchive()
      setShowDeleteConfirm(false)
    } catch {
      // Error handling is done in the parent
    } finally {
      setIsArchiving(false)
    }
  }

  // Don't show action buttons while in edit mode
  if (isEditing) return null

  const isPromoted = idea.status === 'promoted'
  const isArchived = idea.status === 'archived'
  const canPromote = !isPromoted && !isArchived

  return (
    <>
      {/* Promoted banner */}
      {isPromoted && idea.promoted_to_seed_id && orgSlug && projectId && (
        <div className="border-t border-accent-success/20 bg-accent-success/5 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-accent-success font-medium">
              Promoted to Pattern Shop
            </p>
            <a
              href={`/org/${orgSlug}/project/${projectId}/shop`}
              className="inline-flex items-center gap-1 text-sm text-accent-success hover:text-accent-success/80 font-medium transition-colors"
            >
              View seed
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      <div className="border-t border-border-default p-4 flex gap-3 flex-col sm:flex-row">
        {/* Edit */}
        {!isPromoted && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 flex-1 sm:flex-none"
            onClick={onEdit}
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
        )}

        {/* Archive */}
        {!isPromoted && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 flex-1 sm:flex-none text-accent-error hover:bg-accent-error/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4" />
            Archive
          </Button>
        )}

        {/* Promote */}
        {canPromote && (
          <Button
            variant="primary"
            size="sm"
            className="flex items-center gap-2 flex-1 sm:flex-none sm:ml-auto"
            onClick={onPromote}
          >
            <Zap className="w-4 h-4" />
            Promote
          </Button>
        )}
      </div>

      {/* Archive Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this idea?</DialogTitle>
            <DialogClose onClick={() => setShowDeleteConfirm(false)} />
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">&ldquo;{idea.title}&rdquo;</span>{' '}
              will be moved to archived and hidden from The Hall.
            </p>
            <p className="text-xs text-text-tertiary mt-2">
              This is reversible — you can undo within 10 seconds after archiving.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleArchiveConfirm}
              isLoading={isArchiving}
            >
              Yes, archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
