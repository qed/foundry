'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, ChevronDown, ChevronRight, Eye, RotateCcw, GitCompare, Download } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'

interface VersionUser {
  id: string
  name: string
  avatar_url: string | null
}

export interface BlueprintVersionEntry {
  id: string
  version_number: number
  created_by: VersionUser
  created_at: string
  change_note: string | null
  trigger_type: string | null
}

interface BlueprintVersionHistoryProps {
  projectId: string
  blueprintId: string
  onView: (version: BlueprintVersionEntry) => void
  onRestore: (version: BlueprintVersionEntry) => void
  onCompare: (fromVersion: number, toVersion: number) => void
  refreshKey?: number
}

const TRIGGER_LABELS: Record<string, string> = {
  edit: 'Edit',
  status_change: 'Status change',
  ai_generated: 'AI Generated',
  ai_review: 'AI Review',
  restore: 'Restored',
}

export function BlueprintVersionHistory({
  projectId,
  blueprintId,
  onView,
  onRestore,
  onCompare,
  refreshKey,
}: BlueprintVersionHistoryProps) {
  const [expanded, setExpanded] = useState(false)
  const [versions, setVersions] = useState<BlueprintVersionEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const fetchVersions = useCallback(async (limit: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/blueprints/${blueprintId}/versions?limit=${limit}`
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
  }, [projectId, blueprintId])

  useEffect(() => {
    if (expanded) {
      fetchVersions(showAll ? 100 : 5)
    }
  }, [expanded, showAll, fetchVersions, refreshKey])

  const handleDownload = useCallback((versionNumber: number) => {
    window.open(
      `/api/projects/${projectId}/blueprints/${blueprintId}/versions/${versionNumber}/download`,
      '_blank'
    )
  }, [projectId, blueprintId])

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
            <div className="space-y-1.5" role="list">
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
                  onDownload={() => handleDownload(version.version_number)}
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
  onDownload,
}: {
  version: BlueprintVersionEntry
  isCurrent: boolean
  onView: () => void
  onRestore: () => void
  onCompare?: () => void
  onDownload: () => void
}) {
  return (
    <div
      role="listitem"
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
            {version.trigger_type && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                version.trigger_type === 'ai_generated' ? 'bg-accent-purple/15 text-accent-purple' :
                version.trigger_type === 'status_change' ? 'bg-accent-warning/15 text-accent-warning' :
                version.trigger_type === 'restore' ? 'bg-accent-error/15 text-accent-error' :
                'bg-bg-tertiary text-text-tertiary'
              )}>
                {TRIGGER_LABELS[version.trigger_type] || version.trigger_type}
              </span>
            )}
          </div>
          <p className="text-text-tertiary mt-0.5" title={new Date(version.created_at).toLocaleString()}>
            {timeAgo(version.created_at)} by {version.created_by.name}
          </p>
          {version.change_note && (
            <p className="text-text-secondary mt-0.5 truncate">{version.change_note}</p>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 mt-2">
        <button
          onClick={onView}
          className="flex items-center gap-1 px-2 py-1 rounded border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          aria-label={`View version ${version.version_number}`}
        >
          <Eye className="w-3 h-3" />
          View
        </button>

        {!isCurrent && (
          <button
            onClick={onRestore}
            className="flex items-center gap-1 px-2 py-1 rounded border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            aria-label={`Restore to version ${version.version_number}`}
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

        <button
          onClick={onDownload}
          className="flex items-center gap-1 px-2 py-1 rounded border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          aria-label={`Download version ${version.version_number}`}
        >
          <Download className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
