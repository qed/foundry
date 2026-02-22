'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { STATUS_CONFIG } from './types'
import type { IdeaStatus } from '@/types/database'

const CHANGEABLE_STATUSES: { value: IdeaStatus; label: string }[] = [
  { value: 'raw', label: 'Raw' },
  { value: 'developing', label: 'Developing' },
  { value: 'mature', label: 'Mature' },
]

interface BulkStatusModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  onConfirm: (status: IdeaStatus) => Promise<void>
}

export function BulkStatusModal({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
}: BulkStatusModalProps) {
  const [selected, setSelected] = useState<IdeaStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleConfirm() {
    if (!selected) return
    setIsLoading(true)
    try {
      await onConfirm(selected)
      setSelected(null)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
    setSelected(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-lg font-semibold text-text-primary">
            Change status of {selectedCount} {selectedCount === 1 ? 'idea' : 'ideas'}
          </h2>
        </DialogHeader>

        <DialogBody>
          <p className="text-sm text-text-secondary mb-3">
            Select the new status. Promoted and archived ideas will not be affected.
          </p>

          <div className="space-y-2">
            {CHANGEABLE_STATUSES.map((s) => {
              const cfg = STATUS_CONFIG[s.value]
              return (
                <button
                  key={s.value}
                  onClick={() => setSelected(s.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                    selected === s.value
                      ? 'border-accent-cyan bg-accent-cyan/5'
                      : 'border-border-default hover:border-border-default/80 hover:bg-bg-tertiary/30'
                  }`}
                >
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  <span className="text-sm text-text-secondary">
                    Set all to {s.label.toLowerCase()}
                  </span>
                </button>
              )
            })}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={!selected}
          >
            Change Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
