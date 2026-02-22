'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Phase, WorkOrder, PhaseStatus } from '@/types/database'

interface PhaseNavigationProps {
  phases: Phase[]
  workOrders: WorkOrder[]
  selectedPhaseId: string | null
  onSelectPhase: (phaseId: string | null) => void
  onCreatePhase: (name: string, description: string | null) => Promise<void>
  onRenamePhase: (phaseId: string, name: string) => Promise<void>
  onDeletePhase: (phaseId: string) => Promise<void>
  onChangePhaseStatus: (phaseId: string, status: PhaseStatus) => Promise<void>
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-text-tertiary',
  active: 'bg-accent-cyan',
  completed: 'bg-accent-success',
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
}

export function PhaseNavigation({
  phases,
  workOrders,
  selectedPhaseId,
  onSelectPhase,
  onCreatePhase,
  onRenamePhase,
  onDeletePhase,
  onChangePhaseStatus,
}: PhaseNavigationProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const [contextMenu, setContextMenu] = useState<{ phaseId: string; x: number; y: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{ phaseId: string; name: string; woCount: number } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  const getPhaseProgress = (phaseId: string) => {
    const phaseWOs = workOrders.filter((wo) => wo.phase_id === phaseId)
    const done = phaseWOs.filter((wo) => wo.status === 'done').length
    return { done, total: phaseWOs.length }
  }

  const allDone = workOrders.filter((wo) => wo.status === 'done').length

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = () => setContextMenu(null)
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null) }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [contextMenu])

  // Focus inline edit input
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleCreate = useCallback(async () => {
    if (!createName.trim()) return
    setCreating(true)
    try {
      await onCreatePhase(createName.trim(), createDesc.trim() || null)
      setCreateOpen(false)
      setCreateName('')
      setCreateDesc('')
    } finally {
      setCreating(false)
    }
  }, [createName, createDesc, onCreatePhase])

  const handleRename = useCallback(async (phaseId: string) => {
    const trimmed = editName.trim()
    if (!trimmed || trimmed.length > 100) {
      setEditingId(null)
      return
    }
    try {
      await onRenamePhase(phaseId, trimmed)
    } finally {
      setEditingId(null)
    }
  }, [editName, onRenamePhase])

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await onDeletePhase(deleteConfirm.phaseId)
      if (selectedPhaseId === deleteConfirm.phaseId) {
        onSelectPhase(null)
      }
      setDeleteConfirm(null)
    } finally {
      setDeleting(false)
    }
  }, [deleteConfirm, onDeletePhase, selectedPhaseId, onSelectPhase])

  const handleContextMenu = (e: React.MouseEvent, phaseId: string) => {
    e.preventDefault()
    setContextMenu({ phaseId, x: e.clientX, y: e.clientY })
  }

  const startRename = (phase: Phase) => {
    setEditingId(phase.id)
    setEditName(phase.name)
    setContextMenu(null)
  }

  const startDelete = (phase: Phase) => {
    const woCount = workOrders.filter((wo) => wo.phase_id === phase.id).length
    setDeleteConfirm({ phaseId: phase.id, name: phase.name, woCount })
    setContextMenu(null)
  }

  const cycleStatus = async (phase: Phase) => {
    const order: PhaseStatus[] = ['planned', 'active', 'completed']
    const idx = order.indexOf(phase.status)
    const next = order[(idx + 1) % order.length]
    await onChangePhaseStatus(phase.id, next)
    setContextMenu(null)
  }

  const contextPhase = contextMenu ? phases.find((p) => p.id === contextMenu.phaseId) : null

  return (
    <>
      <div className="h-12 flex items-center border-b border-border-default bg-bg-secondary flex-shrink-0">
        {/* Scroll left */}
        <button
          onClick={() => scrollBy(-1)}
          className="p-1.5 text-text-tertiary hover:text-text-primary flex-shrink-0"
          aria-label="Scroll phases left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable tabs */}
        <div
          ref={scrollRef}
          className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide px-1"
        >
          {/* All Phases tab */}
          <button
            onClick={() => onSelectPhase(null)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0',
              selectedPhaseId === null
                ? 'bg-accent-cyan/10 text-accent-cyan'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            )}
          >
            All Phases
            <span className="text-[10px] text-text-tertiary">
              {allDone}/{workOrders.length}
            </span>
          </button>

          {phases.map((phase) => {
            const progress = getPhaseProgress(phase.id)
            const isEditing = editingId === phase.id

            return (
              <button
                key={phase.id}
                onClick={() => {
                  if (!isEditing) onSelectPhase(phase.id)
                }}
                onContextMenu={(e) => handleContextMenu(e, phase.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0',
                  selectedPhaseId === phase.id
                    ? 'bg-accent-cyan/10 text-accent-cyan'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                )}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    STATUS_COLORS[phase.status] || 'bg-text-tertiary'
                  )}
                />
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(phase.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => handleRename(phase.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-bg-primary border border-border-default rounded px-1 py-0.5 text-xs text-text-primary w-24 outline-none focus:border-accent-cyan"
                    maxLength={100}
                  />
                ) : (
                  phase.name
                )}
                <span className="text-[10px] text-text-tertiary">
                  {progress.done}/{progress.total}
                </span>
              </button>
            )
          })}

          {/* Add Phase button */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors flex-shrink-0"
          >
            <Plus className="w-3 h-3" />
            Phase
          </button>
        </div>

        {/* Scroll right */}
        <button
          onClick={() => scrollBy(1)}
          className="p-1.5 text-text-tertiary hover:text-text-primary flex-shrink-0"
          aria-label="Scroll phases right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && contextPhase && (
        <div
          className="fixed z-50 bg-bg-secondary border border-border-default rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => startRename(contextPhase)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Rename
          </button>
          <button
            onClick={() => cycleStatus(contextPhase)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <Circle className="w-3 h-3" />
            Status: {STATUS_LABELS[contextPhase.status]} &rarr;{' '}
            {STATUS_LABELS[
              (['planned', 'active', 'completed'] as const)[
                ((['planned', 'active', 'completed'] as const).indexOf(contextPhase.status) + 1) % 3
              ]
            ]}
          </button>
          <div className="border-t border-border-default my-1" />
          <button
            onClick={() => startDelete(contextPhase)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-accent-error hover:bg-accent-error/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      )}

      {/* Create Phase Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Name *</label>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && createName.trim()) handleCreate() }}
                placeholder="e.g. Design, Development, Testing"
                className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-cyan"
                maxLength={100}
                autoFocus
              />
              <span className="text-[10px] text-text-tertiary mt-1 block text-right">
                {createName.length}/100
              </span>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Description</label>
              <input
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-cyan"
                maxLength={255}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              isLoading={creating}
              disabled={!createName.trim()}
            >
              Create Phase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Phase</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-text-secondary">
            <p>
              Are you sure you want to delete <strong className="text-text-primary">{deleteConfirm?.name}</strong>?
            </p>
            {deleteConfirm && deleteConfirm.woCount > 0 && (
              <p className="mt-2 text-accent-warning">
                {deleteConfirm.woCount} work order{deleteConfirm.woCount !== 1 ? 's' : ''} in this phase will become unphased.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={deleting}
            >
              Delete Phase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
