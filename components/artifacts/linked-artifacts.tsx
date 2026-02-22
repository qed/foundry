'use client'

import { useEffect, useState, useCallback } from 'react'
import { Paperclip, Plus, X, Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast-container'
import { FileTypeIcon } from './file-type-icon'
import { LinkArtifactModal } from './link-artifact-modal'
import { formatFileSize } from '@/lib/artifacts/file-types'
import type { ArtifactEntityType } from '@/types/database'

interface LinkedArtifact {
  id: string
  artifact_id: string
  artifact: {
    id: string
    name: string
    file_type: string
    file_size: number
    project_id: string
  }
  created_by: { display_name: string | null; avatar_url: string | null } | null
  created_at: string
}

interface LinkedArtifactsProps {
  entityType: ArtifactEntityType
  entityId: string
  projectId: string
  editable?: boolean
}

export function LinkedArtifacts({
  entityType,
  entityId,
  projectId,
  editable = false,
}: LinkedArtifactsProps) {
  const [links, setLinks] = useState<LinkedArtifact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const { addToast } = useToast()

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/artifacts/links?entity_type=${entityType}&entity_id=${entityId}`
      )
      if (res.ok) {
        const data = await res.json()
        setLinks(data.links || [])
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const handleLink = useCallback(
    async (artifactId: string) => {
      try {
        const res = await fetch('/api/artifacts/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artifact_id: artifactId,
            entity_type: entityType,
            entity_id: entityId,
          }),
        })

        if (res.status === 409) {
          addToast('Already linked', 'info')
          return
        }

        if (!res.ok) {
          addToast('Failed to link artifact', 'error')
          return
        }

        addToast('Artifact linked', 'success')
        fetchLinks()
      } catch {
        addToast('Failed to link artifact', 'error')
      }
    },
    [entityType, entityId, addToast, fetchLinks]
  )

  const handleRemove = useCallback(
    async (linkId: string) => {
      setRemovingId(linkId)
      try {
        const res = await fetch(`/api/artifacts/links/${linkId}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          addToast('Failed to remove link', 'error')
          return
        }

        setLinks((prev) => prev.filter((l) => l.id !== linkId))
        addToast('Link removed', 'success')
      } catch {
        addToast('Failed to remove link', 'error')
      } finally {
        setRemovingId(null)
      }
    },
    [addToast]
  )

  const handleDownload = useCallback(
    async (artifact: LinkedArtifact['artifact']) => {
      try {
        const res = await fetch(
          `/api/projects/${artifact.project_id}/artifacts/${artifact.id}/download`
        )
        if (res.ok) {
          const { url } = await res.json()
          window.open(url, '_blank')
        }
      } catch {
        addToast('Failed to download', 'error')
      }
    },
    [addToast]
  )

  if (isLoading) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Linked Artifacts
        </h3>
        <div className="flex items-center gap-2 py-3 text-xs text-text-tertiary">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          Linked Artifacts
          {links.length > 0 && (
            <span className="text-[10px] text-text-tertiary font-normal">({links.length})</span>
          )}
        </h3>
        {editable && (
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-accent-cyan hover:text-accent-cyan/80 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Link
          </button>
        )}
      </div>

      {links.length === 0 ? (
        <div className="flex items-center gap-2 py-3 text-text-tertiary text-xs">
          <Paperclip className="w-3.5 h-3.5" />
          <span>No artifacts linked</span>
          {editable && (
            <button
              onClick={() => setShowLinkModal(true)}
              className="text-accent-cyan hover:underline ml-1"
            >
              Add one
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border-default hover:bg-bg-tertiary/50 transition-colors group"
            >
              <FileTypeIcon fileType={link.artifact.file_type} className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary font-medium truncate">
                  {link.artifact.name}
                </p>
                <p className="text-[10px] text-text-tertiary">
                  {link.artifact.file_type.toUpperCase()} &middot; {formatFileSize(link.artifact.file_size)}
                </p>
              </div>
              <div className={cn(
                'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
              )}>
                <button
                  onClick={() => handleDownload(link.artifact)}
                  className="p-1 text-text-tertiary hover:text-accent-cyan rounded transition-colors"
                  title="Download"
                >
                  <Download className="w-3 h-3" />
                </button>
                {editable && (
                  <button
                    onClick={() => handleRemove(link.id)}
                    disabled={removingId === link.id}
                    className="p-1 text-text-tertiary hover:text-accent-error rounded transition-colors disabled:opacity-50"
                    title="Remove link"
                  >
                    {removingId === link.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link Artifact Modal */}
      <LinkArtifactModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        projectId={projectId}
        onLink={handleLink}
        excludeIds={links.map((l) => l.artifact_id)}
      />
    </div>
  )
}
