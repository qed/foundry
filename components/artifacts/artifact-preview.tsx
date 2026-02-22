'use client'

import { useState, useCallback } from 'react'
import {
  X,
  Download,
  Trash2,
  Pencil,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileTypeIcon } from './file-type-icon'
import { formatFileSize, getFileCategory } from '@/lib/artifacts/file-types'
import { timeAgo } from '@/lib/utils'
import type { Artifact } from '@/types/database'

interface ArtifactPreviewProps {
  artifact: Artifact & {
    uploaded_by_profile?: { display_name: string | null; avatar_url: string | null } | null
  }
  projectId: string
  onClose: () => void
  onDelete: (id: string) => void
  onRename: (id: string) => void
  onDownload: (id: string) => void
}

export function ArtifactPreview({
  artifact,
  projectId,
  onClose,
  onDelete,
  onRename,
  onDownload,
}: ArtifactPreviewProps) {
  const category = getFileCategory(artifact.file_type)

  return (
    <div className="h-full flex flex-col bg-bg-secondary border-l border-border-default">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileTypeIcon fileType={artifact.file_type} className="w-4 h-4 shrink-0" />
          <h3 className="text-sm font-medium text-text-primary truncate">{artifact.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-y-auto p-4">
        {category === 'image' ? (
          <ImagePreview artifact={artifact} projectId={projectId} />
        ) : category === 'audio' ? (
          <AudioPreview artifact={artifact} projectId={projectId} />
        ) : artifact.content_text ? (
          <TextPreview text={artifact.content_text} />
        ) : (
          <DocumentPreview artifact={artifact} />
        )}
      </div>

      {/* Metadata & Actions */}
      <div className="px-4 py-3 border-t border-border-default shrink-0 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-text-tertiary">Size</span>
            <p className="text-text-secondary">{formatFileSize(artifact.file_size)}</p>
          </div>
          <div>
            <span className="text-text-tertiary">Type</span>
            <p className="text-text-secondary uppercase">{artifact.file_type}</p>
          </div>
          <div>
            <span className="text-text-tertiary">Uploaded</span>
            <p className="text-text-secondary">{timeAgo(artifact.created_at)}</p>
          </div>
          {artifact.uploaded_by_profile?.display_name && (
            <div>
              <span className="text-text-tertiary">By</span>
              <p className="text-text-secondary">{artifact.uploaded_by_profile.display_name}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDownload(artifact.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-cyan text-bg-primary rounded-lg hover:bg-accent-cyan/90 transition-colors"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
          <button
            onClick={() => onRename(artifact.id)}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
            title="Rename"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(artifact.id)}
            className="p-1.5 text-text-tertiary hover:text-accent-error hover:bg-accent-error/10 rounded transition-colors ml-auto"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-previews ────────────────────────────────────────────

function ImagePreview({
  artifact,
  projectId,
}: {
  artifact: Artifact
  projectId: string
}) {
  const [zoom, setZoom] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  // Build Supabase storage URL
  const imageUrl = `/api/projects/${projectId}/artifacts/${artifact.id}/download`

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
          className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-text-tertiary w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors"
          title="Reset zoom"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-auto rounded-lg border border-border-default bg-bg-primary">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={artifact.name}
          className={cn('transition-transform', isLoading && 'hidden')}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </div>
    </div>
  )
}

function AudioPreview({
  artifact,
  projectId,
}: {
  artifact: Artifact
  projectId: string
}) {
  const audioUrl = `/api/projects/${projectId}/artifacts/${artifact.id}/download`

  return (
    <div className="space-y-3">
      <div className="p-6 bg-bg-primary border border-border-default rounded-lg flex flex-col items-center">
        <FileTypeIcon fileType={artifact.file_type} className="w-12 h-12 mb-4" />
        <p className="text-sm text-text-primary font-medium mb-4">{artifact.name}</p>
        <audio controls className="w-full max-w-sm" preload="none">
          <source src={audioUrl} />
          Your browser does not support audio playback.
        </audio>
      </div>
    </div>
  )
}

function TextPreview({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const preview = text.slice(0, 500)
  const truncated = text.length > 500

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-tertiary">Text content</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-primary transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-accent-success" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 bg-bg-primary border border-border-default rounded-lg text-xs text-text-secondary whitespace-pre-wrap font-mono overflow-x-auto max-h-[400px]">
        {preview}
        {truncated && (
          <span className="text-text-tertiary">{'\n\n'}... ({text.length - 500} more characters)</span>
        )}
      </pre>
    </div>
  )
}

function DocumentPreview({ artifact }: { artifact: Artifact }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileTypeIcon fileType={artifact.file_type} className="w-16 h-16 mb-4" />
      <p className="text-sm font-medium text-text-primary mb-1">{artifact.name}</p>
      <p className="text-xs text-text-tertiary mb-1">
        {artifact.file_type.toUpperCase()} &middot; {formatFileSize(artifact.file_size)}
      </p>
      <p className="text-[10px] text-text-tertiary">
        Preview not available for this file type. Use Download to view.
      </p>
    </div>
  )
}
