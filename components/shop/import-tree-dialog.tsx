'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, FolderOpen, Puzzle, Layers, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FeatureLevel } from '@/types/database'

interface ParsedNode {
  tempId: string
  parentTempId: string | null
  title: string
  description: string | null
  level: FeatureLevel
}

interface ImportTreeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onImportSuccess: () => void
}

const LEVEL_ICONS: Record<FeatureLevel, React.ReactNode> = {
  epic: <FolderOpen className="w-4 h-4 text-accent-purple" />,
  feature: <Puzzle className="w-4 h-4 text-accent-cyan" />,
  sub_feature: <Layers className="w-4 h-4 text-text-secondary" />,
  task: <CheckCircle2 className="w-4 h-4 text-text-tertiary" />,
}

export function ImportTreeDialog({
  open,
  onOpenChange,
  projectId,
  onImportSuccess,
}: ImportTreeDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsedNodes, setParsedNodes] = useState<ParsedNode[]>([])
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [importing, setImporting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const reset = useCallback(() => {
    setFile(null)
    setParsedNodes([])
    setStep('upload')
    setImporting(false)
    setParsing(false)
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
    if (!ext || !['json', 'csv'].includes(ext)) {
      setError('Supported formats: .json, .csv')
      return
    }

    if (selectedFile.size > 1_000_000) {
      setError('File size must be under 1MB')
      return
    }

    const text = await selectedFile.text()
    setFile(selectedFile)

    // Parse and preview
    setParsing(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/feature-nodes/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, format: ext }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse file')
      }

      setParsedNodes(data.preview)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setParsing(false)
    }
  }, [projectId])

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
    if (parsedNodes.length === 0) return
    setImporting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/feature-nodes/bulk-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: parsedNodes }),
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
  }, [parsedNodes, projectId, onImportSuccess, handleClose])

  // Count nodes by level
  const levelCounts = parsedNodes.reduce((acc, n) => {
    acc[n.level] = (acc[n.level] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Feature Tree</DialogTitle>
          <DialogClose onClick={handleClose} />
        </DialogHeader>

        <DialogBody className="space-y-4">
          {step === 'upload' && (
            <>
              {/* Drop zone */}
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
                  Drop a <strong>.json</strong> or <strong>.csv</strong> file here, or click to browse
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Use a file exported from Helix, or match the expected format
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {parsing && (
                <p className="text-sm text-text-secondary text-center">Parsing file...</p>
              )}
            </>
          )}

          {step === 'preview' && (
            <>
              {/* File info */}
              <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg">
                <FileText className="w-5 h-5 text-accent-cyan flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{file?.name}</p>
                  <p className="text-xs text-text-tertiary">{parsedNodes.length} nodes found</p>
                </div>
                <button
                  onClick={reset}
                  className="p-1 hover:bg-bg-secondary rounded"
                >
                  <X className="w-4 h-4 text-text-tertiary" />
                </button>
              </div>

              {/* Level summary */}
              <div className="flex gap-3 flex-wrap">
                {(['epic', 'feature', 'sub_feature', 'task'] as FeatureLevel[]).map((level) => {
                  const count = levelCounts[level] || 0
                  if (count === 0) return null
                  return (
                    <div key={level} className="flex items-center gap-1.5 text-xs text-text-secondary">
                      {LEVEL_ICONS[level]}
                      <span>{count} {level.replace(/_/g, ' ')}{count !== 1 ? 's' : ''}</span>
                    </div>
                  )
                })}
              </div>

              {/* Node preview list */}
              <div className="max-h-48 overflow-y-auto border border-border-default rounded-lg">
                {parsedNodes.slice(0, 50).map((node) => (
                  <div
                    key={node.tempId}
                    className="flex items-center gap-2 px-3 py-1.5 border-b border-border-default last:border-b-0"
                  >
                    {LEVEL_ICONS[node.level]}
                    <span className="text-sm text-text-primary truncate">{node.title}</span>
                    <span className="text-xs text-text-tertiary ml-auto flex-shrink-0">
                      {node.level.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
                {parsedNodes.length > 50 && (
                  <div className="px-3 py-2 text-xs text-text-tertiary text-center">
                    ...and {parsedNodes.length - 50} more
                  </div>
                )}
              </div>
            </>
          )}

          {error && <p className="text-sm text-accent-error">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          {step === 'preview' && (
            <Button
              variant="primary"
              onClick={handleImport}
              isLoading={importing}
            >
              Import {parsedNodes.length} Nodes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
