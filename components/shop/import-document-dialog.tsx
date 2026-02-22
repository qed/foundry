'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DocType } from '@/types/database'

interface ImportDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  featureNodeId?: string | null
  onImportSuccess: () => void
}

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: 'feature_requirement', label: 'Feature Requirement' },
  { value: 'technical_requirement', label: 'Technical Requirement' },
  { value: 'product_overview', label: 'Product Overview' },
]

export function ImportDocumentDialog({
  open,
  onOpenChange,
  projectId,
  featureNodeId,
  onImportSuccess,
}: ImportDocumentDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState<DocType>('feature_requirement')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const reset = useCallback(() => {
    setFile(null)
    setFileContent('')
    setTitle('')
    setDocType('feature_requirement')
    setImporting(false)
    setError(null)
    setDragOver(false)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onOpenChange(false)
  }, [reset, onOpenChange])

  const processFile = useCallback(async (selectedFile: File) => {
    setError(null)

    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!ext || !['md', 'txt', 'markdown'].includes(ext)) {
      setError('Supported formats: .md, .txt')
      return
    }

    if (selectedFile.size > 500_000) {
      setError('File size must be under 500KB')
      return
    }

    const text = await selectedFile.text()
    setFile(selectedFile)
    setFileContent(text)

    // Auto-fill title from filename or H1
    const h1Match = text.match(/^#\s+(.+)$/m)
    const autoTitle = h1Match ? h1Match[1].trim() : selectedFile.name.replace(/\.[^/.]+$/, '')
    setTitle(autoTitle)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) processFile(selectedFile)
    },
    [processFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) processFile(droppedFile)
    },
    [processFile]
  )

  const handleImport = useCallback(async () => {
    if (!fileContent || !title.trim()) return
    setImporting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/requirements-documents/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: fileContent,
          fileName: file?.name || 'document.md',
          docType,
          title: title.trim(),
          featureNodeId: featureNodeId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Import failed')
      }

      onImportSuccess()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setImporting(false)
    }
  }, [fileContent, title, projectId, file, docType, featureNodeId, onImportSuccess, handleClose])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Document</DialogTitle>
          <DialogClose onClick={handleClose} />
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Drop zone */}
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                dragOver
                  ? 'border-accent-cyan bg-accent-cyan/5'
                  : 'border-border-default hover:border-text-tertiary'
              )}
            >
              <Upload className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
              <p className="text-sm text-text-secondary">
                Drop a <strong>.md</strong> or <strong>.txt</strong> file here, or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.markdown"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg">
              <FileText className="w-5 h-5 text-accent-cyan flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{file.name}</p>
                <p className="text-xs text-text-tertiary">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={() => { setFile(null); setFileContent('') }}
                className="p-1 hover:bg-bg-secondary rounded"
              >
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              placeholder="Document title"
            />
          </div>

          {/* Doc Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
            >
              {DOC_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {fileContent && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Preview</label>
              <pre className="max-h-32 overflow-y-auto p-3 bg-bg-primary border border-border-default rounded-lg text-xs text-text-secondary whitespace-pre-wrap">
                {fileContent.slice(0, 1000)}{fileContent.length > 1000 ? '...' : ''}
              </pre>
            </div>
          )}

          {error && (
            <p className="text-sm text-accent-error">{error}</p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleImport}
            isLoading={importing}
            disabled={!file || !title.trim()}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
