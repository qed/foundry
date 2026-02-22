'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, ChevronDown, ChevronRight, Eye, RotateCcw, GitCompare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'

interface VersionUser {
  id: string
  name: string
}

interface Version {
  id: string
  version_number: number
  content: string
  created_by: VersionUser
  created_at: string
  change_summary: string | null
}

interface VersionHistoryPanelProps {
  projectId: string
  docId: string
  onView: (version: Version) => void
  onRestore: (version: Version) => void
  onCompare: (fromVersion: number, toVersion: number) => void
  refreshKey?: number
}

export function VersionHistoryPanel({
  projectId,
  docId,
  onView,
  onRestore,
  onCompare,
  refreshKey,
}: VersionHistoryPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const fetchVersions = useCallback(async (limit: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/requirements-documents/${docId}/versions?limit=${limit}`
      )
      if (!res.ok) return
      const data = await res.json()
      setVersions(data.versions || [])
      setTotal(data.total || 0)
    } catch {
      // Silently ignore
    } finally {
      setLoading(false)
    }
  }, [projectId, docId])

  useEffect(() => {
    if (expanded) {
      fetchVersions(showAll ? 100 : 5)
    }
  }, [expanded, showAll, fetchVersions, refreshKey])

  return (
    <div className="border-t border-border-default">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        <Clock className="w-4 h-4" />
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>Version History</span>
        {total > 0 && (
          <span className="text-xs text-text-tertiary ml-auto">{total} version{total !== 1 ? 's' : ''}</span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          {loading && versions.length === 0 ? (
            <p className="text-xs text-text-tertiary py-2">Loading versions...</p>
          ) : versions.length === 0 ? (
            <p className="text-xs text-text-tertiary py-2">No versions yet. Versions are created on significant edits.</p>
          ) : (
            <div className="space-y-1.5">
              {versions.map((version, index) => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isCurrent={index === 0}
                  onView={() => onView(version)}
                  onRestore={() => onRestore(version)}
                  onCompare={index < versions.length - 1
                    ? () => onCompare(versions[index + 1].version_number, version.version_number)
                    : undefined
                  }
                />
              ))}

              {!showAll && total > 5 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-xs text-accent-cyan hover:underline mt-1"
                >
                  Show all {total} versions
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function VersionItem({
  version,
  isCurrent,
  onView,
  onRestore,
  onCompare,
}: {
  version: Version
  isCurrent: boolean
  onView: () => void
  onRestore: () => void
  onCompare?: () => void
}) {
  return (
    <div
      className={cn(
        'p-2.5 rounded-lg border text-xs',
        isCurrent
          ? 'border-accent-cyan/30 bg-accent-cyan/5'
          : 'border-border-default bg-bg-primary'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-text-primary">v{version.version_number}</span>
            {isCurrent && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan font-medium">
                Current
              </span>
            )}
          </div>
          <p className="text-text-tertiary mt-0.5">
            {timeAgo(version.created_at)} by {version.created_by.name || 'Unknown'}
          </p>
          {version.change_summary && (
            <p className="text-text-secondary mt-0.5 truncate">{version.change_summary}</p>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 mt-2">
        <button
          onClick={onView}
          className="flex items-center gap-1 px-2 py-1 rounded border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <Eye className="w-3 h-3" />
          View
        </button>

        {!isCurrent && (
          <button
            onClick={onRestore}
            className="flex items-center gap-1 px-2 py-1 rounded border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Restore
          </button>
        )}

        {onCompare && (
          <button
            onClick={onCompare}
            className="flex items-center gap-1 px-2 py-1 rounded border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <GitCompare className="w-3 h-3" />
            Compare
          </button>
        )}
      </div>
    </div>
  )
}
