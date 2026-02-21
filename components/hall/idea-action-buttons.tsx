'use client'

import { useState } from 'react'
import { Pencil, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import type { IdeaWithDetails } from './types'

interface IdeaActionButtonsProps {
  idea: IdeaWithDetails
}

export function IdeaActionButtons({ idea }: IdeaActionButtonsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <>
      <div className="border-t border-border-default p-4 flex gap-3 flex-col sm:flex-row">
        {/* Edit — placeholder for Phase 017 */}
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 flex-1 sm:flex-none"
          disabled
          title="Edit will be available in a future update"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </Button>

        {/* Delete — placeholder for Phase 017 */}
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 flex-1 sm:flex-none text-accent-error hover:bg-accent-error/10"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="w-4 h-4" />
          Archive
        </Button>

        {/* Promote — placeholder for Phase 025 */}
        {idea.status !== 'promoted' && (
          <Button
            variant="primary"
            size="sm"
            className="flex items-center gap-2 flex-1 sm:flex-none sm:ml-auto"
            disabled
            title="Promote will be available in a future update"
          >
            <Zap className="w-4 h-4" />
            Promote
          </Button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this idea?</DialogTitle>
            <DialogClose onClick={() => setShowDeleteConfirm(false)} />
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-text-secondary">
              Are you sure you want to archive{' '}
              <span className="font-semibold text-text-primary">&ldquo;{idea.title}&rdquo;</span>?
              This will move it to the archived state. You can restore it later.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled
              title="Archive will be available in a future update"
            >
              Yes, archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
