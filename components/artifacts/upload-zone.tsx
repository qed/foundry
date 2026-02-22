'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image, Music, Table2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateFile, getAcceptString, formatFileSize, getFileCategory } from '@/lib/artifacts/file-types'
import type { Artifact } from '@/types/database'

interface UploadFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'complete' | 'error'
  progress: number
  error?: string
  artifact?: Artifact
}

interface UploadZoneProps {
  projectId: string
  folderId?: string | null
  onUploadComplete?: (artifact: Artifact) => void
  multiple?: boolean
  compact?: boolean
}

const CATEGORY_ICONS = {
  document: FileText,
  image: Image,
  audio: Music,
  spreadsheet: Table2,
  other: FileText,
}

export function UploadZone({
  projectId,
  folderId,
  onUploadComplete,
  multiple = true,
  compact = false,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newFiles: UploadFile[] = []
      for (const file of Array.from(fileList)) {
        const validation = validateFile(file)
        newFiles.push({
          id: crypto.randomUUID(),
          file,
          status: validation.valid ? 'pending' : 'error',
          progress: 0,
          error: validation.error,
        })
      }
      setFiles((prev) => (multiple ? [...prev, ...newFiles] : newFiles))
    },
    [multiple]
  )

  const uploadFile = useCallback(
    async (uploadFile: UploadFile) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f))
      )

      try {
        const formData = new FormData()
        formData.append('file', uploadFile.file)
        if (folderId) formData.append('folder_id', folderId)

        // Simulate progress (we can't track actual XHR progress with fetch)
        const progressTimer = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id && f.status === 'uploading' && f.progress < 80
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          )
        }, 200)

        const res = await fetch(`/api/projects/${projectId}/artifacts`, {
          method: 'POST',
          body: formData,
        })

        clearInterval(progressTimer)

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Upload failed' }))
          throw new Error(data.error || 'Upload failed')
        }

        const data = await res.json()

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'complete', progress: 100, artifact: data.artifact }
              : f
          )
        )

        onUploadComplete?.(data.artifact)
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
              : f
          )
        )
      }
    },
    [projectId, folderId, onUploadComplete]
  )

  const handleUploadAll = useCallback(() => {
    const pending = files.filter((f) => f.status === 'pending')
    for (const file of pending) {
      uploadFile(file)
    }
  }, [files, uploadFile])

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
    }
    // Reset input so the same file can be selected again
    e.target.value = ''
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl cursor-pointer transition-colors',
          compact ? 'p-4' : 'p-8',
          isDragOver
            ? 'border-accent-cyan bg-accent-cyan/5'
            : 'border-border-default hover:border-text-tertiary'
        )}
      >
        <div className="flex flex-col items-center text-center">
          <Upload className={cn('text-text-tertiary mb-2', compact ? 'w-5 h-5' : 'w-8 h-8')} />
          <p className={cn('text-text-secondary', compact ? 'text-xs' : 'text-sm')}>
            Drop files here or{' '}
            <span className="text-accent-cyan underline">browse</span>
          </p>
          {!compact && (
            <p className="text-[10px] text-text-tertiary mt-1">
              PDF, DOCX, MD, TXT, PNG, JPG, CSV, XLSX, MP3, WAV — up to 50MB
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={getAcceptString()}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => {
            const category = getFileCategory(f.file.name.split('.').pop() || '')
            const Icon = CATEGORY_ICONS[category]

            return (
              <div
                key={f.id}
                className="flex items-center gap-3 px-3 py-2 bg-bg-tertiary rounded-lg"
              >
                <Icon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">{f.file.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-tertiary">
                      {formatFileSize(f.file.size)}
                    </span>
                    {f.status === 'uploading' && (
                      <div className="flex-1 h-1 bg-bg-primary rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className="h-full bg-accent-cyan rounded-full transition-all duration-300"
                          style={{ width: `${f.progress}%` }}
                        />
                      </div>
                    )}
                    {f.status === 'error' && (
                      <span className="text-[10px] text-accent-error">{f.error}</span>
                    )}
                  </div>
                </div>
                {f.status === 'complete' && (
                  <CheckCircle2 className="w-4 h-4 text-accent-success flex-shrink-0" />
                )}
                {f.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-accent-error flex-shrink-0" />
                )}
                {(f.status === 'pending' || f.status === 'error') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}
                    className="p-0.5 text-text-tertiary hover:text-text-primary"
                    aria-label="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}

          {/* Upload button */}
          {pendingCount > 0 && (
            <button
              onClick={handleUploadAll}
              className="w-full py-2 bg-accent-cyan text-bg-primary text-xs font-medium rounded-lg hover:bg-accent-cyan/90 transition-colors"
            >
              Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
