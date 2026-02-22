'use client'

import { useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ExportTreeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

type TreeFormat = 'json' | 'markdown' | 'csv'

const FORMAT_OPTIONS: { value: TreeFormat; label: string; ext: string; description: string }[] = [
  { value: 'json', label: 'JSON', ext: '.json', description: 'Structured data — importable back into Helix' },
  { value: 'markdown', label: 'Markdown', ext: '.md', description: 'Visual tree representation' },
  { value: 'csv', label: 'CSV', ext: '.csv', description: 'Spreadsheet-compatible — importable back into Helix' },
]

export function ExportTreeDialog({
  open,
  onOpenChange,
  projectId,
}: ExportTreeDialogProps) {
  const [format, setFormat] = useState<TreeFormat>('json')
  const [includeDescriptions, setIncludeDescriptions] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = useCallback(async () => {
    setExporting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/feature-nodes/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, includeDescriptions }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Export failed')
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      const ext = format === 'json' ? '.json' : format === 'csv' ? '.csv' : '.md'
      const filename = filenameMatch ? filenameMatch[1] : `feature_tree${ext}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }, [projectId, format, includeDescriptions, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Feature Tree</DialogTitle>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Format</label>
            <div className="space-y-2">
              {FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    format === opt.value
                      ? 'border-accent-cyan bg-accent-cyan/5'
                      : 'border-border-default hover:border-text-tertiary'
                  )}
                >
                  <input
                    type="radio"
                    name="tree-format"
                    value={opt.value}
                    checked={format === opt.value}
                    onChange={() => setFormat(opt.value)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      format === opt.value ? 'border-accent-cyan' : 'border-text-tertiary'
                    )}
                  >
                    {format === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-accent-cyan" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-text-primary font-medium">
                      {opt.label} <span className="text-text-tertiary font-normal">({opt.ext})</span>
                    </span>
                    <p className="text-xs text-text-tertiary">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {format === 'json' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDescriptions}
                onChange={(e) => setIncludeDescriptions(e.target.checked)}
                className="rounded border-border-default"
              />
              <span className="text-sm text-text-secondary">Include descriptions</span>
            </label>
          )}

          {error && <p className="text-sm text-accent-error">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleExport} isLoading={exporting}>
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
