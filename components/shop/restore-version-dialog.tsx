'use client'

import { useState, useCallback } from 'react'
import { RotateCcw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { timeAgo } from '@/lib/utils'

interface RestoreVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  docId: string
  version: {
    version_number: number
    created_by: { name: string }
    created_at: string
    change_summary: string | null
  } | null
  onRestoreComplete: (content: string) => void
}

export function RestoreVersionDialog({
  open,
  onOpenChange,
  projectId,
  docId,
  version,
  onRestoreComplete,
}: RestoreVersionDialogProps) {
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRestore = useCallback(async () => {
    if (!version) return
    setRestoring(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/projects/${projectId}/requirements-documents/${docId}/versions/${version.version_number}/restore`,
        { method: 'POST' }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to restore')
      }

      // Fetch the restored version content to update editor
      const versionRes = await fetch(
        `/api/projects/${projectId}/requirements-documents/${docId}/versions/${version.version_number}`
      )
      if (versionRes.ok) {
        const versionData = await versionRes.json()
        onRestoreComplete(versionData.content)
      }

      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setRestoring(false)
    }
  }, [version, projectId, docId, onRestoreComplete, onOpenChange])

  if (!version) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore to version {version.version_number}?</DialogTitle>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>

        <DialogBody className="space-y-3">
          <p className="text-sm text-text-secondary">
            This will revert the document to:
          </p>
          <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
            <p className="text-sm text-text-primary font-medium">
              {version.change_summary || `Version ${version.version_number}`}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              {timeAgo(version.created_at)} by {version.created_by.name || 'Unknown'}
            </p>
          </div>
          <p className="text-xs text-text-tertiary">
            A new version will be created recording this restoration. No content will be permanently lost.
          </p>

          {error && <p className="text-sm text-accent-error">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleRestore} isLoading={restoring}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
