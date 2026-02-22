'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { timeAgo } from '@/lib/utils'

interface VersionViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: {
    version_number: number
    content: string
    created_by: { name: string }
    created_at: string
    change_summary: string | null
  } | null
}

export function VersionViewModal({ open, onOpenChange, version }: VersionViewModalProps) {
  if (!version) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Version {version.version_number}
            <span className="text-sm font-normal text-text-tertiary ml-2">
              {timeAgo(version.created_at)} by {version.created_by.name || 'Unknown'}
            </span>
          </DialogTitle>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>

        {version.change_summary && (
          <div className="px-6 py-2 bg-bg-tertiary border-b border-border-default">
            <p className="text-xs text-text-secondary">{version.change_summary}</p>
          </div>
        )}

        <DialogBody className="flex-1 overflow-y-auto min-h-0">
          <div
            className="prose-foundry"
            dangerouslySetInnerHTML={{ __html: version.content }}
          />
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
