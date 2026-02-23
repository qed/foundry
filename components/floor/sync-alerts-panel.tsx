'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Eye,
  X,
  FileText,
  Clock,
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { useToast } from '@/components/ui/toast-container'

interface SyncAlert {
  id: string
  project_id: string
  work_order_id: string
  blueprint_id: string
  change_type: 'content_changed' | 'requirements_changed' | 'acceptance_criteria_changed'
  change_summary: string
  status: 'new' | 'acknowledged' | 'resolved'
  created_at: string
  updated_at: string
  resolved_at: string | null
  resolved_by: string | null
  blueprint_title: string
}

interface SyncAlertsPanelProps {
  projectId: string
  workOrderId: string
  open: boolean
  onClose: () => void
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  content_changed: 'Content Changed',
  requirements_changed: 'Requirements Changed',
  acceptance_criteria_changed: 'Acceptance Criteria Changed',
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-accent-warning/10 text-accent-warning' },
  acknowledged: { label: 'Acknowledged', className: 'bg-accent-cyan/10 text-accent-cyan' },
  resolved: { label: 'Resolved', className: 'bg-accent-success/10 text-accent-success' },
}

export function SyncAlertsPanel({
  projectId,
  workOrderId,
  open,
  onClose,
}: SyncAlertsPanelProps) {
  const [alerts, setAlerts] = useState<SyncAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { addToast } = useToast()

  const fetchAlerts = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(
        `/api/projects/${projectId}/work-orders/${workOrderId}/sync-alerts`
      )
      if (!res.ok) return
      const data = await res.json()
      setAlerts(data.alerts || [])
    } catch {
      // Silently ignore
    } finally {
      setIsLoading(false)
    }
  }, [projectId, workOrderId])

  useEffect(() => {
    if (open) {
      fetchAlerts()
      setSelectedIds(new Set())
    }
  }, [open, fetchAlerts])

  const updateAlertStatus = useCallback(async (alertId: string, status: string) => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/work-orders/${workOrderId}/sync-alerts/${alertId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      )
      if (!res.ok) throw new Error('Failed to update')
      await fetchAlerts()
      addToast(`Alert ${status}`, 'success')
    } catch {
      addToast('Failed to update alert', 'error')
    }
  }, [projectId, workOrderId, fetchAlerts, addToast])

  const handleBulkUpdate = useCallback(async (status: string) => {
    if (selectedIds.size === 0) return
    try {
      const res = await fetch(
        `/api/projects/${projectId}/work-orders/${workOrderId}/sync-alerts/bulk-update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alert_ids: [...selectedIds], status }),
        }
      )
      if (!res.ok) throw new Error('Failed to bulk update')
      const data = await res.json()
      setSelectedIds(new Set())
      await fetchAlerts()
      addToast(`${data.updated_count} alert${data.updated_count !== 1 ? 's' : ''} ${status}`, 'success')
    } catch {
      addToast('Failed to update alerts', 'error')
    }
  }, [projectId, workOrderId, selectedIds, fetchAlerts, addToast])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    const unresolvedIds = alerts.filter((a) => a.status !== 'resolved').map((a) => a.id)
    if (selectedIds.size === unresolvedIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(unresolvedIds))
    }
  }

  if (!open) return null

  // Group alerts by blueprint
  const grouped = alerts.reduce<Record<string, SyncAlert[]>>((acc, alert) => {
    const key = alert.blueprint_id
    if (!acc[key]) acc[key] = []
    acc[key].push(alert)
    return acc
  }, {})

  const unresolvedAlerts = alerts.filter((a) => a.status !== 'resolved')

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-bg-secondary border-l border-border-default shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent-warning" />
            <h3 className="text-sm font-semibold text-text-primary">
              Sync Alerts
            </h3>
            {unresolvedAlerts.length > 0 && (
              <span className="text-[10px] bg-accent-warning/20 text-accent-warning rounded-full px-2 py-0.5">
                {unresolvedAlerts.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary border-b border-border-default">
            <span className="text-xs text-text-secondary">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => handleBulkUpdate('acknowledged')}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-accent-cyan hover:bg-accent-cyan/10 rounded transition-colors"
            >
              <Eye className="w-3 h-3" />
              Acknowledge
            </button>
            <button
              onClick={() => handleBulkUpdate('resolved')}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-accent-success hover:bg-accent-success/10 rounded transition-colors"
            >
              <CheckCheck className="w-3 h-3" />
              Resolve
            </button>
          </div>
        )}

        {/* Select all toggle */}
        {unresolvedAlerts.length > 1 && (
          <div className="px-4 py-1.5 border-b border-border-default">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === unresolvedAlerts.length && unresolvedAlerts.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-border-default accent-accent-cyan"
              />
              <span className="text-[10px] text-text-tertiary">Select all unresolved</span>
            </label>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Check className="w-8 h-8 text-accent-success mb-2 opacity-50" />
              <p className="text-sm text-text-secondary">No sync alerts</p>
              <p className="text-xs text-text-tertiary mt-1">
                This work order is in sync with its source blueprint.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {Object.entries(grouped).map(([blueprintId, groupAlerts]) => (
                <div key={blueprintId} className="px-4 py-3">
                  {/* Blueprint group header */}
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-3.5 h-3.5 text-accent-purple" />
                    <span className="text-xs font-medium text-text-primary truncate">
                      {groupAlerts[0].blueprint_title}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      ({groupAlerts.length})
                    </span>
                  </div>

                  {/* Alerts in this group */}
                  <div className="space-y-2 ml-5">
                    {groupAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        selected={selectedIds.has(alert.id)}
                        onToggleSelect={() => toggleSelect(alert.id)}
                        onAcknowledge={() => updateAlertStatus(alert.id, 'acknowledged')}
                        onResolve={() => updateAlertStatus(alert.id, 'resolved')}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AlertCard({
  alert,
  selected,
  onToggleSelect,
  onAcknowledge,
  onResolve,
}: {
  alert: SyncAlert
  selected: boolean
  onToggleSelect: () => void
  onAcknowledge: () => void
  onResolve: () => void
}) {
  const badge = STATUS_BADGES[alert.status]

  return (
    <div
      className={cn(
        'rounded-lg border p-2.5 transition-colors',
        alert.status === 'new'
          ? 'border-accent-warning/20 bg-accent-warning/5'
          : alert.status === 'acknowledged'
            ? 'border-accent-cyan/20 bg-bg-primary'
            : 'border-border-default bg-bg-primary opacity-60'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Checkbox for unresolved */}
        {alert.status !== 'resolved' && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-0.5 rounded border-border-default accent-accent-cyan"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-text-tertiary">
              {CHANGE_TYPE_LABELS[alert.change_type] || alert.change_type}
            </span>
            <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full', badge.className)}>
              {badge.label}
            </span>
          </div>

          {/* Change summary */}
          <p className="text-xs text-text-primary leading-relaxed mb-1.5">
            {alert.change_summary}
          </p>

          {/* Footer row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
              <Clock className="w-2.5 h-2.5" />
              {timeAgo(alert.created_at)}
            </div>

            {alert.status !== 'resolved' && (
              <div className="flex items-center gap-1">
                {alert.status === 'new' && (
                  <button
                    onClick={onAcknowledge}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-accent-cyan hover:bg-accent-cyan/10 rounded transition-colors"
                  >
                    <Eye className="w-2.5 h-2.5" />
                    Acknowledge
                  </button>
                )}
                <button
                  onClick={onResolve}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-accent-success hover:bg-accent-success/10 rounded transition-colors"
                >
                  <CheckCheck className="w-2.5 h-2.5" />
                  Resolve
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
