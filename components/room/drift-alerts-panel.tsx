'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle,
  X,
  CheckCircle2,
  Eye,
  ChevronDown,
  ChevronRight,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast-container'
import type { DriftAlert } from '@/types/database'

interface EnrichedAlert extends DriftAlert {
  blueprint: { id: string; title: string; status: string } | null
  requirement_doc: { id: string; title: string; doc_type: string } | null
}

interface DriftAlertsPanelProps {
  projectId: string
  onClose: () => void
  onNavigateBlueprint?: (blueprintId: string) => void
}

type FilterStatus = 'all' | 'new' | 'acknowledged' | 'resolved'

const SEVERITY_STYLES: Record<string, string> = {
  high: 'bg-accent-error/10 text-accent-error border-accent-error/20',
  medium: 'bg-accent-warning/10 text-accent-warning border-accent-warning/20',
  low: 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20',
}

export function DriftAlertsPanel({ projectId, onClose, onNavigateBlueprint }: DriftAlertsPanelProps) {
  const [alerts, setAlerts] = useState<EnrichedAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const { addToast } = useToast()

  const fetchAlerts = useCallback(async () => {
    try {
      const filterParam = filter === 'all' ? '' : `&status=${filter}`
      const res = await fetch(`/api/projects/${projectId}/drift-alerts?${filterParam}`)
      if (!res.ok) return
      const data = await res.json()
      setAlerts(data.alerts || [])
    } catch {
      // Silently ignore
    } finally {
      setIsLoading(false)
    }
  }, [projectId, filter])

  useEffect(() => {
    setIsLoading(true)
    fetchAlerts()
  }, [fetchAlerts])

  const handleUpdateStatus = useCallback(async (alertId: string, status: string) => {
    const res = await fetch(`/api/projects/${projectId}/drift-alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      fetchAlerts()
      addToast(`Alert ${status === 'resolved' ? 'resolved' : 'acknowledged'}`, 'success')
    }
  }, [projectId, fetchAlerts, addToast])

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedIds.size === 0) return
    const res = await fetch(`/api/projects/${projectId}/drift-alerts/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertIds: [...selectedIds], action }),
    })
    if (res.ok) {
      setSelectedIds(new Set())
      fetchAlerts()
      addToast(`${selectedIds.size} alert(s) ${action === 'resolve' ? 'resolved' : 'acknowledged'}`, 'success')
    }
  }, [projectId, selectedIds, fetchAlerts, addToast])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === alerts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(alerts.map((a) => a.id)))
    }
  }

  const counts = {
    new: alerts.filter((a) => a.status === 'new').length,
    acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
    resolved: alerts.filter((a) => a.status === 'resolved').length,
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-secondary">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-accent-warning flex-shrink-0" />
          <h3 className="text-sm font-semibold text-text-primary">Drift Alerts</h3>
          {!isLoading && (
            <span className="text-xs text-text-tertiary">({alerts.length})</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="px-3 py-1.5 border-b border-border-default flex items-center gap-1">
        {(['all', 'new', 'acknowledged', 'resolved'] as FilterStatus[]).map((f) => {
          const count = f === 'all' ? alerts.length : counts[f]
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                filter === f
                  ? 'bg-accent-cyan/10 text-accent-cyan'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
              )}
            >
              {f === 'all' ? 'All' : f === 'new' ? 'New' : f === 'acknowledged' ? 'Ack' : 'Resolved'} ({count})
            </button>
          )
        })}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="px-3 py-1.5 border-b border-border-default flex items-center gap-2 bg-accent-cyan/5">
          <span className="text-xs text-accent-cyan font-medium">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={() => handleBulkAction('acknowledge')}>
            Acknowledge
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleBulkAction('resolve')}>
            Resolve
          </Button>
        </div>
      )}

      {/* Alerts list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="sm" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-8 h-8 text-accent-success mx-auto mb-2 opacity-50" />
            <p className="text-sm text-text-secondary">No drift alerts</p>
            <p className="text-xs text-text-tertiary mt-1">
              {filter === 'all'
                ? 'All blueprints are in sync with requirements.'
                : `No ${filter} alerts.`}
            </p>
          </div>
        ) : (
          <>
            {/* Select all */}
            <div className="flex items-center gap-2 pb-1">
              <input
                type="checkbox"
                checked={selectedIds.size === alerts.length && alerts.length > 0}
                onChange={selectAll}
                className="rounded border-border-default"
              />
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Select all</span>
            </div>

            {alerts.map((alert) => {
              const isExpanded = expandedIds.has(alert.id)
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'glass-panel rounded-lg p-3 transition-all',
                    alert.status === 'resolved' && 'opacity-50'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(alert.id)}
                      onChange={() => toggleSelect(alert.id)}
                      className="mt-1 rounded border-border-default"
                    />

                    <button
                      onClick={() => toggleExpand(alert.id)}
                      className="mt-0.5 text-text-tertiary hover:text-text-primary"
                    >
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5" />
                        : <ChevronRight className="w-3.5 h-3.5" />
                      }
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Top row: severity + type badges */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded border',
                          SEVERITY_STYLES[alert.severity]
                        )}>
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-text-tertiary px-1.5 py-0.5 rounded bg-bg-tertiary">
                          {alert.alert_type === 'requirement_changed' ? 'Req Changed' : 'Code Changed'}
                        </span>
                        {alert.status === 'acknowledged' && (
                          <span className="text-[10px] text-accent-warning px-1.5 py-0.5 rounded bg-accent-warning/10">
                            Acknowledged
                          </span>
                        )}
                        {alert.status === 'resolved' && (
                          <span className="text-[10px] text-accent-success px-1.5 py-0.5 rounded bg-accent-success/10">
                            Resolved
                          </span>
                        )}
                      </div>

                      {/* Blueprint name */}
                      {alert.blueprint && (
                        <button
                          onClick={() => onNavigateBlueprint?.(alert.blueprint!.id)}
                          className="text-xs font-medium text-accent-cyan hover:underline flex items-center gap-1 mb-0.5"
                        >
                          <FileText className="w-3 h-3" />
                          {alert.blueprint.title}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {/* Description */}
                      <p className="text-xs text-text-secondary line-clamp-2">{alert.description}</p>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-2 space-y-2">
                          {alert.change_summary && (
                            <div className="text-xs text-text-tertiary bg-bg-tertiary rounded px-2 py-1">
                              {alert.change_summary}
                            </div>
                          )}
                          {alert.requirement_doc && (
                            <p className="text-xs text-text-tertiary">
                              Requirement: {alert.requirement_doc.title}
                            </p>
                          )}
                          <p className="text-[10px] text-text-tertiary">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 pt-1">
                            {alert.status === 'new' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateStatus(alert.id, 'acknowledged')}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Acknowledge
                              </Button>
                            )}
                            {alert.status !== 'resolved' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Resolve
                              </Button>
                            )}
                            {alert.status === 'resolved' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateStatus(alert.id, 'new')}
                              >
                                Reopen
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Timestamp (when collapsed) */}
                      {!isExpanded && (
                        <p className="text-[10px] text-text-tertiary mt-0.5">
                          {timeAgo(alert.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
