'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface BulkDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  onConfirm: () => Promise<void>
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
}: BulkDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleConfirm() {
    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-accent-error" />
            <h2 className="text-lg font-semibold text-text-primary">
              Archive {selectedCount} {selectedCount === 1 ? 'idea' : 'ideas'}?
            </h2>
          </div>
        </DialogHeader>

        <DialogBody>
          <p className="text-sm text-text-secondary">
            This will archive {selectedCount} {selectedCount === 1 ? 'idea' : 'ideas'}.
            Archived ideas can be restored via the undo action in the toast notification.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} isLoading={isLoading}>
            Archive {selectedCount} {selectedCount === 1 ? 'Idea' : 'Ideas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
