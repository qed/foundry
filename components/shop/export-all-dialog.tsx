'use client'

import { useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ExportAllDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

type AllFormat = 'markdown' | 'html'

const FORMAT_OPTIONS: { value: AllFormat; label: string; ext: string; description: string }[] = [
  { value: 'markdown', label: 'Concatenated Markdown', ext: '.md', description: 'All FRDs in one file with table of contents' },
  { value: 'html', label: 'Styled HTML', ext: '.html', description: 'All FRDs in styled page — print to PDF for sharing' },
]

export function ExportAllDialog({
  open,
  onOpenChange,
  projectId,
}: ExportAllDialogProps) {
  const [format, setFormat] = useState<AllFormat>('markdown')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = useCallback(async () => {
    setExporting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/requirements-documents/export-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Export failed')
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `requirements.${format === 'markdown' ? 'md' : 'html'}`

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
  }, [projectId, format, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export All Requirements</DialogTitle>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>

        <DialogBody className="space-y-4">
          <p className="text-sm text-text-secondary">
            Export all requirements documents (Product Overview + FRDs) in one file.
          </p>

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
                    name="all-format"
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

          {error && <p className="text-sm text-accent-error">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleExport} isLoading={exporting}>
            <Download className="w-4 h-4 mr-1.5" />
            Export All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
