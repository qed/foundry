'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  ChevronDown,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import type { WorkOrderStatus, WorkOrderPriority, Phase } from '@/types/database'

export interface MemberInfo {
  user_id: string
  display_name: string
  avatar_url: string | null
}

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkStatusChange: (status: WorkOrderStatus) => Promise<void>
  onBulkPriorityChange: (priority: WorkOrderPriority) => Promise<void>
  onBulkAssign: (assigneeId: string | null) => Promise<void>
  onBulkPhaseChange: (phaseId: string | null) => Promise<void>
  onBulkDelete: () => Promise<void>
  phases: Phase[]
  members: MemberInfo[]
}

const STATUS_OPTIONS: { value: WorkOrderStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-text-tertiary' },
  { value: 'ready', label: 'Ready', color: 'bg-text-secondary' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-accent-cyan' },
  { value: 'in_review', label: 'In Review', color: 'bg-accent-purple' },
  { value: 'done', label: 'Done', color: 'bg-accent-success' },
]

const PRIORITY_OPTIONS: { value: WorkOrderPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-accent-error' },
  { value: 'high', label: 'High', color: 'bg-accent-warning' },
  { value: 'medium', label: 'Medium', color: 'bg-accent-cyan' },
  { value: 'low', label: 'Low', color: 'bg-text-tertiary' },
]

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  onBulkPriorityChange,
  onBulkAssign,
  onBulkPhaseChange,
  onBulkDelete,
  phases,
  members,
}: BulkActionBarProps) {
  const [loading, setLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  if (selectedCount === 0) return null

  const handleAction = async (fn: () => Promise<void>) => {
    setLoading(true)
    try {
      await fn()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-accent-cyan/5 border-b border-accent-cyan/20 flex-shrink-0">
        {/* Selection count */}
        <span className="text-xs font-medium text-accent-cyan">
          {selectedCount} selected
        </span>

        <span className="w-px h-4 bg-border-default" />

        {/* Status dropdown */}
        <ActionDropdown
          label="Status"
          disabled={loading}
          items={STATUS_OPTIONS.map((s) => ({
            key: s.value,
            label: s.label,
            dot: s.color,
            onClick: () => handleAction(() => onBulkStatusChange(s.value)),
          }))}
        />

        {/* Priority dropdown */}
        <ActionDropdown
          label="Priority"
          disabled={loading}
          items={PRIORITY_OPTIONS.map((p) => ({
            key: p.value,
            label: p.label,
            dot: p.color,
            onClick: () => handleAction(() => onBulkPriorityChange(p.value)),
          }))}
        />

        {/* Assign dropdown */}
        <ActionDropdown
          label="Assign"
          disabled={loading}
          items={[
            { key: 'unassign', label: 'Unassigned', onClick: () => handleAction(() => onBulkAssign(null)) },
            ...members.map((m) => ({
              key: m.user_id,
              label: m.display_name,
              avatar: m,
              onClick: () => handleAction(() => onBulkAssign(m.user_id)),
            })),
          ]}
        />

        {/* Phase dropdown */}
        <ActionDropdown
          label="Phase"
          disabled={loading}
          items={[
            { key: 'unphase', label: 'Unphased', onClick: () => handleAction(() => onBulkPhaseChange(null)) },
            ...phases.map((p) => ({
              key: p.id,
              label: p.name,
              onClick: () => handleAction(() => onBulkPhaseChange(p.id)),
            })),
          ]}
        />

        <span className="w-px h-4 bg-border-default" />

        {/* Delete */}
        <button
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-accent-error hover:bg-accent-error/10 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>

        <div className="flex-1" />

        {/* Loading indicator */}
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-cyan" />}

        {/* Clear selection */}
        <button
          onClick={onClearSelection}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent-error" />
              Delete {selectedCount} work order{selectedCount !== 1 ? 's' : ''}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            This action cannot be undone. All selected work orders and their activity history will be permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={loading}
              onClick={async () => {
                await handleAction(async () => {
                  await onBulkDelete()
                  setDeleteConfirmOpen(false)
                })
              }}
            >
              Delete {selectedCount} Work Order{selectedCount !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ── Action Dropdown ───────────────────────────────────────────── */

interface DropdownItem {
  key: string
  label: string
  dot?: string
  avatar?: MemberInfo
  onClick: () => void
}

function ActionDropdown({
  label,
  disabled,
  items,
}: {
  label: string
  disabled: boolean
  items: DropdownItem[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = useCallback((fn: () => void) => {
    setOpen(false)
    fn()
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
      >
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-bg-secondary border border-border-default rounded-lg shadow-lg z-20 py-1 max-h-[240px] overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => handleClick(item.onClick)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-bg-tertiary transition-colors flex items-center gap-2"
            >
              {item.dot && <span className={cn('w-2 h-2 rounded-full flex-shrink-0', item.dot)} />}
              {item.avatar && (
                <Avatar
                  src={item.avatar.avatar_url || undefined}
                  alt={item.avatar.display_name}
                  initials={getInitials(item.avatar.display_name)}
                  size="sm"
                />
              )}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
