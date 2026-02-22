'use client'

import { useState, useCallback } from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { BlueprintEditor } from './blueprint-editor'
import { SystemDiagramEditor } from './system-diagram-editor'
import { BlueprintActivityTimeline } from './blueprint-activity-timeline'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Blueprint, BlueprintStatus } from '@/types/database'
import type { JSONContent } from '@tiptap/react'
import type { MermaidContent } from '@/lib/blueprints/system-diagram-template'

interface RoomCenterPanelProps {
  projectId: string
  blueprint: Blueprint | null
  onStatusChange?: (blueprintId: string, status: BlueprintStatus) => void
}

const STATUS_OPTIONS: { value: BlueprintStatus; label: string; description: string }[] = [
  { value: 'draft', label: 'Draft', description: 'Blueprint is being written, not ready for review' },
  { value: 'in_review', label: 'In Review', description: 'Ready for team review and feedback' },
  { value: 'approved', label: 'Approved', description: 'Reviewed and approved, ready for implementation' },
  { value: 'implemented', label: 'Implemented', description: 'Has been implemented in production' },
]

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20',
  in_review: 'bg-accent-warning/10 text-accent-warning border-accent-warning/20',
  approved: 'bg-accent-success/10 text-accent-success border-accent-success/20',
  implemented: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
}

const STATUS_DOT_COLORS: Record<string, string> = {
  draft: 'bg-text-tertiary',
  in_review: 'bg-accent-warning',
  approved: 'bg-accent-success',
  implemented: 'bg-accent-cyan',
}

const TYPE_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  system_diagram: 'System Diagram',
  feature: 'Feature',
}

// Confirmation is required for approved/implemented (final states)
const CONFIRM_STATUSES: BlueprintStatus[] = ['approved', 'implemented']

export function RoomCenterPanel({ projectId, blueprint, onStatusChange }: RoomCenterPanelProps) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ status: BlueprintStatus } | null>(null)

  const handleSave = useCallback(async (content: JSONContent) => {
    if (!blueprint) return
    const res = await fetch(`/api/projects/${projectId}/blueprints/${blueprint.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) throw new Error('Save failed')
  }, [projectId, blueprint])

  const handleDiagramSave = useCallback(async (content: MermaidContent) => {
    if (!blueprint) return
    const res = await fetch(`/api/projects/${projectId}/blueprints/${blueprint.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) throw new Error('Save failed')
  }, [projectId, blueprint])

  const handleStatusSelect = useCallback((newStatus: BlueprintStatus) => {
    if (!blueprint || newStatus === blueprint.status || !onStatusChange) return
    setStatusDropdownOpen(false)

    if (CONFIRM_STATUSES.includes(newStatus)) {
      setConfirmDialog({ status: newStatus })
    } else {
      onStatusChange(blueprint.id, newStatus)
    }
  }, [blueprint, onStatusChange])

  const handleConfirmStatus = useCallback(() => {
    if (!blueprint || !confirmDialog || !onStatusChange) return
    onStatusChange(blueprint.id, confirmDialog.status)
    setConfirmDialog(null)
  }, [blueprint, confirmDialog, onStatusChange])

  if (!blueprint) {
    return (
      <div className="flex-1 flex items-center justify-center min-w-0">
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="Select a blueprint to view"
          description="Choose a blueprint from the panel on the left, or create a new one to get started."
        />
      </div>
    )
  }

  const confirmOpt = confirmDialog
    ? STATUS_OPTIONS.find((o) => o.value === confirmDialog.status)
    : null

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Type / Title / Status header */}
      <div className="h-10 flex items-center gap-3 px-4 border-b border-border-default bg-bg-secondary flex-shrink-0">
        <span className="text-[10px] text-text-tertiary uppercase tracking-wide">
          {TYPE_LABELS[blueprint.blueprint_type] || blueprint.blueprint_type}
        </span>
        <span className="text-text-tertiary">/</span>
        <span className="text-sm font-medium text-text-primary truncate">
          {blueprint.title}
        </span>

        {/* View Feature link for feature blueprints */}
        {blueprint.blueprint_type === 'feature' && blueprint.feature_node_id && (
          <a
            href={`/projects/${projectId}/shop?node=${blueprint.feature_node_id}`}
            className="flex items-center gap-1 text-[10px] text-accent-purple hover:text-accent-purple/80 transition-colors flex-shrink-0"
            title="View feature in Pattern Shop"
          >
            <ExternalLink className="w-3 h-3" />
            View Feature
          </a>
        )}

        <div className="flex-1" />

        {/* Status dropdown */}
        <div className="relative">
          <button
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-pointer transition-colors',
              STATUS_STYLES[blueprint.status] || ''
            )}
          >
            {STATUS_OPTIONS.find((o) => o.value === blueprint.status)?.label || blueprint.status}
          </button>

          {statusDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setStatusDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-bg-secondary border border-border-default rounded-lg shadow-lg py-1 min-w-[160px]">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusSelect(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                      opt.value === blueprint.status
                        ? 'text-accent-cyan bg-accent-cyan/5'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT_COLORS[opt.value])} />
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      {blueprint.blueprint_type === 'system_diagram' ? (
        <SystemDiagramEditor
          key={blueprint.id}
          content={blueprint.content as MermaidContent | null}
          onSave={handleDiagramSave}
        />
      ) : (
        <BlueprintEditor
          key={blueprint.id}
          content={blueprint.content as JSONContent | null}
          onSave={handleSave}
        />
      )}

      {/* Activity timeline */}
      <BlueprintActivityTimeline
        key={`activity-${blueprint.id}`}
        projectId={projectId}
        blueprintId={blueprint.id}
      />

      {/* Status change confirmation dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => { if (!open) setConfirmDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Blueprint Status</DialogTitle>
          </DialogHeader>
          {confirmOpt && (
            <div className="py-2">
              <p className="text-sm text-text-secondary">
                Change status to <span className="font-medium text-text-primary">{confirmOpt.label}</span>?
              </p>
              <p className="text-xs text-text-tertiary mt-2">{confirmOpt.description}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmStatus}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
