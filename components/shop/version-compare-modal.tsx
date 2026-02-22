'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface DiffLine {
  type: 'context' | 'addition' | 'deletion'
  text: string
}

interface VersionCompareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  docId: string
  fromVersion: number
  toVersion: number
}

export function VersionCompareModal({
  open,
  onOpenChange,
  projectId,
  docId,
  fromVersion,
  toVersion,
}: VersionCompareModalProps) {
  const [diff, setDiff] = useState<DiffLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !fromVersion || !toVersion) return

    let cancelled = false

    async function fetchDiff() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/projects/${projectId}/requirements-documents/${docId}/versions/compare?from=${fromVersion}&to=${toVersion}`
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to load diff')
        }
        const data = await res.json()
        if (!cancelled) setDiff(data.diff || [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load diff')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDiff()
    return () => { cancelled = true }
  }, [open, projectId, docId, fromVersion, toVersion])

  const additions = diff.filter((d) => d.type === 'addition').length
  const deletions = diff.filter((d) => d.type === 'deletion').length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Compare: v{fromVersion} → v{toVersion}
          </DialogTitle>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>

        {!loading && !error && diff.length > 0 && (
          <div className="flex items-center gap-3 px-6 py-2 bg-bg-tertiary border-b border-border-default text-xs">
            <span className="text-accent-success">+{additions} added</span>
            <span className="text-accent-error">-{deletions} removed</span>
          </div>
        )}

        <DialogBody className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <p className="text-sm text-accent-error text-center py-12">{error}</p>
          ) : diff.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-12">No differences found.</p>
          ) : (
            <div className="font-mono text-sm leading-6">
              {diff.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    'px-3 py-0.5 whitespace-pre-wrap break-words',
                    line.type === 'addition' && 'bg-accent-success/10 text-accent-success border-l-2 border-accent-success',
                    line.type === 'deletion' && 'bg-accent-error/10 text-accent-error border-l-2 border-accent-error line-through',
                    line.type === 'context' && 'text-text-secondary'
                  )}
                >
                  <span className="inline-block w-5 text-text-tertiary mr-2 select-none text-right">
                    {line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '}
                  </span>
                  {line.text || '\u00A0'}
                </div>
              ))}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
