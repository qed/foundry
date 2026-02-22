'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileTypeIcon } from './file-type-icon'
import { formatFileSize } from '@/lib/artifacts/file-types'
import { timeAgo } from '@/lib/utils'
import type { Artifact } from '@/types/database'

interface LinkArtifactModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onLink: (artifactId: string) => void
  excludeIds?: string[]
}

export function LinkArtifactModal({
  isOpen,
  onClose,
  projectId,
  onLink,
  excludeIds = [],
}: LinkArtifactModalProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isOpen) return

    async function fetchArtifacts() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/artifacts`)
        if (res.ok) {
          const data = await res.json()
          setArtifacts(data.artifacts || [])
        }
      } catch {
        // Non-blocking
      } finally {
        setIsLoading(false)
      }
    }

    fetchArtifacts()
  }, [isOpen, projectId])

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
    }
  }, [isOpen])

  const handleSelect = useCallback(
    (artifactId: string) => {
      onLink(artifactId)
      onClose()
    },
    [onLink, onClose]
  )

  const filtered = artifacts
    .filter((a) => !excludeIds.includes(a.id))
    .filter((a) =>
      search
        ? a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.file_type.toLowerCase().includes(search.toLowerCase())
        : true
    )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border-default rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
          <h3 className="text-sm font-semibold text-text-primary">Link Artifact</h3>
          <button
            onClick={onClose}
            className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border-default shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              autoFocus
              type="text"
              placeholder="Search artifacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
            />
          </div>
        </div>

        {/* Artifact list */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-text-tertiary">
                {search ? 'No matching artifacts' : 'No artifacts available'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((artifact) => (
                <button
                  key={artifact.id}
                  onClick={() => handleSelect(artifact.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                    'hover:bg-bg-tertiary transition-colors'
                  )}
                >
                  <FileTypeIcon fileType={artifact.file_type} className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary font-medium truncate">
                      {artifact.name}
                    </p>
                    <p className="text-[10px] text-text-tertiary">
                      {artifact.file_type.toUpperCase()} &middot; {formatFileSize(artifact.file_size)} &middot; {timeAgo(artifact.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
