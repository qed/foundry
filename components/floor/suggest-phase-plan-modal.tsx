'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { WorkOrder } from '@/types/database'

/* ── Types ─────────────────────────────────────────────────────── */

interface SuggestedPhase {
  name: string
  work_order_titles: string[]
  work_order_ids: string[]
  reasoning: string
  estimated_duration: string
  dependencies: string[]
  risks: string[]
}

interface PhasePlan {
  phases: SuggestedPhase[]
  overall_reasoning: string
  critical_path: string
}

interface SuggestPhasePlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  workOrders: WorkOrder[]
  onApplied: () => void
}

type Step = 'analyzing' | 'review' | 'applying' | 'done'

/* ── Modal ─────────────────────────────────────────────────────── */

export function SuggestPhasePlanModal({
  open,
  onOpenChange,
  projectId,
  workOrders,
  onApplied,
}: SuggestPhasePlanModalProps) {
  const [step, setStep] = useState<Step>('analyzing')
  const [error, setError] = useState<string | null>(null)
  const [primaryPlan, setPrimaryPlan] = useState<PhasePlan | null>(null)
  const [alternatives, setAlternatives] = useState<PhasePlan[]>([])
  const [activePlanIndex, setActivePlanIndex] = useState(0) // 0 = primary, 1+ = alternatives
  const [editingPhases, setEditingPhases] = useState<EditablePhase[]>([])
  const [applyResult, setApplyResult] = useState<{ phases: number; workOrders: number } | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set())

  // Build work order lookup
  const woMap = new Map(workOrders.map((wo) => [wo.id, wo]))

  // Start analysis on open
  useEffect(() => {
    if (!open) return

    async function analyze() {
      setStep('analyzing')
      setError(null)
      setPrimaryPlan(null)
      setAlternatives([])
      setActivePlanIndex(0)
      setEditingPhases([])
      setApplyResult(null)
      setExpandedPhases(new Set())
      try {
        const res = await fetch(`/api/projects/${projectId}/work-orders/suggest-phases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to generate suggestions')
          return
        }

        const data = await res.json()
        setPrimaryPlan(data.primary)
        setAlternatives(data.alternatives || [])
        setEditingPhases(planToEditable(data.primary))
        setExpandedPhases(new Set([0])) // expand first phase
        setStep('review')
      } catch {
        setError('Network error during analysis')
      }
    }

    analyze()
  }, [open, projectId])

  // Switch between primary and alternative plans
  const handleSwitchPlan = useCallback((index: number) => {
    setActivePlanIndex(index)
    const plan = index === 0 ? primaryPlan : alternatives[index - 1]
    if (plan) {
      setEditingPhases(planToEditable(plan))
      setExpandedPhases(new Set([0]))
    }
  }, [primaryPlan, alternatives])

  // Phase editing callbacks
  const updatePhase = (idx: number, updates: Partial<EditablePhase>) => {
    setEditingPhases((prev) => prev.map((p, i) => (i === idx ? { ...p, ...updates } : p)))
  }

  const removeWorkOrderFromPhase = (phaseIdx: number, woId: string) => {
    setEditingPhases((prev) =>
      prev.map((p, i) =>
        i === phaseIdx
          ? { ...p, work_order_ids: p.work_order_ids.filter((id) => id !== woId) }
          : p
      )
    )
  }

  const addWorkOrderToPhase = (phaseIdx: number, woId: string) => {
    setEditingPhases((prev) =>
      prev.map((p, i) =>
        i === phaseIdx
          ? { ...p, work_order_ids: [...p.work_order_ids, woId] }
          : p
      )
    )
  }

  const removePhase = (idx: number) => {
    setEditingPhases((prev) => prev.filter((_, i) => i !== idx))
  }

  const addPhase = () => {
    setEditingPhases((prev) => [
      ...prev,
      { name: `Phase ${prev.length + 1}`, work_order_ids: [], reasoning: '', estimated_duration: '1-2 weeks', risks: [], editingName: true },
    ])
    setExpandedPhases((prev) => new Set([...prev, editingPhases.length]))
  }

  const toggleExpanded = (idx: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  // Get all assigned WO IDs across all phases
  const assignedIds = new Set(editingPhases.flatMap((p) => p.work_order_ids))
  const unassignedWOs = workOrders.filter((wo) => !assignedIds.has(wo.id))
  const totalAssigned = editingPhases.reduce((sum, p) => sum + p.work_order_ids.length, 0)

  // Apply the plan
  const handleApply = useCallback(async () => {
    const validPhases = editingPhases.filter((p) => p.name.trim())
    if (validPhases.length === 0) return

    setStep('applying')
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/phases/apply-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phases: validPhases.map((p) => ({
            name: p.name.trim(),
            description: p.reasoning || null,
            work_order_ids: p.work_order_ids,
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setApplyResult({ phases: data.phases_created, workOrders: data.work_orders_assigned })
        setStep('done')
        onApplied()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to apply plan')
        setStep('review')
      }
    } catch {
      setError('Network error while applying plan')
      setStep('review')
    }
  }, [projectId, editingPhases, onApplied])

  const activePlan = activePlanIndex === 0 ? primaryPlan : alternatives[activePlanIndex - 1]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'analyzing' && 'Analyzing Work Orders...'}
            {step === 'review' && 'Suggested Phase Plan'}
            {step === 'applying' && 'Applying Phase Plan...'}
            {step === 'done' && 'Phase Plan Applied'}
          </DialogTitle>
        </DialogHeader>

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-accent-error/10 border border-accent-error/20 rounded-lg text-xs text-accent-error">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && !error && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
            <p className="text-sm text-text-secondary">
              Analyzing {workOrders.length} work order{workOrders.length !== 1 ? 's' : ''}...
            </p>
            <p className="text-xs text-text-tertiary">Considering features, priorities, and dependencies</p>
          </div>
        )}

        {/* Error state with retry */}
        {step === 'analyzing' && error && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Button size="sm" onClick={() => { setError(null); onOpenChange(false); setTimeout(() => onOpenChange(true), 100) }}>
              Retry
            </Button>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {/* Plan switcher */}
            {alternatives.length > 0 && (
              <div className="flex items-center gap-2 pb-2 border-b border-border-default">
                <span className="text-xs text-text-tertiary">Plan:</span>
                <button
                  onClick={() => handleSwitchPlan(0)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    activePlanIndex === 0
                      ? 'bg-accent-cyan/10 text-accent-cyan'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  )}
                >
                  Primary
                </button>
                {alternatives.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleSwitchPlan(i + 1)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                      activePlanIndex === i + 1
                        ? 'bg-accent-cyan/10 text-accent-cyan'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    )}
                  >
                    Alternative {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Overall reasoning */}
            {activePlan?.overall_reasoning && (
              <div className="px-3 py-2 bg-bg-tertiary/50 rounded-lg text-xs text-text-secondary">
                {activePlan.overall_reasoning}
              </div>
            )}

            {/* Stats bar */}
            <div className="flex items-center gap-4 text-xs text-text-tertiary">
              <span>{editingPhases.length} phase{editingPhases.length !== 1 ? 's' : ''}</span>
              <span>{totalAssigned}/{workOrders.length} work orders assigned</span>
              {unassignedWOs.length > 0 && (
                <span className="text-accent-warning">{unassignedWOs.length} unassigned</span>
              )}
            </div>

            {/* Phase cards */}
            {editingPhases.map((phase, idx) => (
              <PhaseCard
                key={idx}
                phase={phase}
                index={idx}
                expanded={expandedPhases.has(idx)}
                onToggleExpanded={() => toggleExpanded(idx)}
                onUpdateName={(name) => updatePhase(idx, { name, editingName: false })}
                onStartEditName={() => updatePhase(idx, { editingName: true })}
                onRemovePhase={() => removePhase(idx)}
                onRemoveWorkOrder={(woId) => removeWorkOrderFromPhase(idx, woId)}
                onAddWorkOrder={(woId) => addWorkOrderToPhase(idx, woId)}
                woMap={woMap}
                unassignedWOs={unassignedWOs}
              />
            ))}

            {/* Add phase button */}
            <button
              onClick={addPhase}
              className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-border-default rounded-lg text-xs text-text-tertiary hover:text-text-primary hover:border-text-tertiary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Phase
            </button>

            {/* Unassigned work orders */}
            {unassignedWOs.length > 0 && (
              <div className="border border-accent-warning/20 rounded-lg p-3 bg-accent-warning/5">
                <p className="text-xs font-medium text-accent-warning mb-2">
                  {unassignedWOs.length} Unassigned Work Order{unassignedWOs.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-1">
                  {unassignedWOs.slice(0, 10).map((wo) => (
                    <div key={wo.id} className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary flex-shrink-0" />
                      <span className="truncate">{wo.title}</span>
                    </div>
                  ))}
                  {unassignedWOs.length > 10 && (
                    <p className="text-[10px] text-text-tertiary">...and {unassignedWOs.length - 10} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Applying */}
        {step === 'applying' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
            <p className="text-sm text-text-secondary">Creating phases and assigning work orders...</p>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && applyResult && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-accent-success/10 flex items-center justify-center">
              <Check className="w-6 h-6 text-accent-success" />
            </div>
            <p className="text-sm text-text-primary font-medium">
              Created {applyResult.phases} phase{applyResult.phases !== 1 ? 's' : ''} and assigned {applyResult.workOrders} work order{applyResult.workOrders !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-text-tertiary">Check the phase tabs to see your new plan</p>
          </div>
        )}

        <DialogFooter>
          {step === 'analyzing' && error && (
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
          {step === 'review' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={editingPhases.length === 0 || editingPhases.every((p) => !p.name.trim())}
              >
                Apply Plan ({editingPhases.length} phase{editingPhases.length !== 1 ? 's' : ''})
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Phase Card ────────────────────────────────────────────────── */

interface EditablePhase {
  name: string
  work_order_ids: string[]
  reasoning: string
  estimated_duration: string
  risks: string[]
  editingName?: boolean
}

function PhaseCard({
  phase,
  index,
  expanded,
  onToggleExpanded,
  onUpdateName,
  onStartEditName,
  onRemovePhase,
  onRemoveWorkOrder,
  onAddWorkOrder,
  woMap,
  unassignedWOs,
}: {
  phase: EditablePhase
  index: number
  expanded: boolean
  onToggleExpanded: () => void
  onUpdateName: (name: string) => void
  onStartEditName: () => void
  onRemovePhase: () => void
  onRemoveWorkOrder: (woId: string) => void
  onAddWorkOrder: (woId: string) => void
  woMap: Map<string, WorkOrder>
  unassignedWOs: WorkOrder[]
}) {
  const [nameInput, setNameInput] = useState(phase.name)
  const [showAddWO, setShowAddWO] = useState(false)

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      onUpdateName(nameInput.trim())
    }
  }

  const PRIORITY_DOT: Record<string, string> = {
    critical: 'bg-accent-error',
    high: 'bg-accent-warning',
    medium: 'bg-accent-cyan',
    low: 'bg-text-tertiary',
  }

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-bg-secondary cursor-pointer"
        onClick={onToggleExpanded}
      >
        <GripVertical className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
        )}

        <span className="text-[10px] text-text-tertiary font-mono flex-shrink-0">#{index + 1}</span>

        {/* Phase name — inline editable */}
        {phase.editingName ? (
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit()
              if (e.key === 'Escape') onUpdateName(phase.name)
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="flex-1 bg-bg-primary border border-accent-cyan/30 rounded px-1.5 py-0.5 text-sm text-text-primary outline-none"
          />
        ) : (
          <span
            className="flex-1 text-sm font-medium text-text-primary truncate group"
            onClick={(e) => { e.stopPropagation(); onStartEditName() }}
          >
            {phase.name}
            <Pencil className="w-2.5 h-2.5 text-text-tertiary inline ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-text-tertiary">{phase.work_order_ids.length} WO{phase.work_order_ids.length !== 1 ? 's' : ''}</span>
          {phase.estimated_duration && (
            <span className="flex items-center gap-0.5 text-[10px] text-text-tertiary">
              <Clock className="w-2.5 h-2.5" />
              {phase.estimated_duration}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemovePhase() }}
            className="p-0.5 text-text-tertiary hover:text-accent-error transition-colors rounded"
            title="Remove phase"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 py-2 space-y-2 border-t border-border-default">
          {/* Reasoning */}
          {phase.reasoning && (
            <p className="text-xs text-text-secondary">{phase.reasoning}</p>
          )}

          {/* Risks */}
          {phase.risks.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {phase.risks.map((risk, i) => (
                <span key={i} className="text-[10px] text-accent-warning bg-accent-warning/10 px-1.5 py-0.5 rounded">
                  {risk}
                </span>
              ))}
            </div>
          )}

          {/* Work orders */}
          <div className="space-y-1">
            {phase.work_order_ids.length === 0 && (
              <p className="text-xs text-text-tertiary italic">No work orders assigned</p>
            )}
            {phase.work_order_ids.map((woId) => {
              const wo = woMap.get(woId)
              if (!wo) return null
              return (
                <div key={woId} className="flex items-center gap-2 group/wo">
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[wo.priority] || 'bg-text-tertiary')} />
                  <span className="text-xs text-text-primary truncate flex-1">{wo.title}</span>
                  <span className="text-[10px] text-text-tertiary capitalize">{wo.priority}</span>
                  <button
                    onClick={() => onRemoveWorkOrder(woId)}
                    className="p-0.5 text-text-tertiary hover:text-accent-error transition-colors rounded opacity-0 group-hover/wo:opacity-100"
                    title="Remove from phase"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Add work order */}
          {unassignedWOs.length > 0 && (
            <div>
              {showAddWO ? (
                <div className="border border-border-default rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                  {unassignedWOs.map((wo) => (
                    <button
                      key={wo.id}
                      onClick={() => { onAddWorkOrder(wo.id); setShowAddWO(false) }}
                      className="flex items-center gap-2 w-full text-left px-1.5 py-1 rounded hover:bg-bg-tertiary transition-colors"
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[wo.priority] || 'bg-text-tertiary')} />
                      <span className="text-xs text-text-primary truncate">{wo.title}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setShowAddWO(true)}
                  className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-accent-cyan transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add work order
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────────────── */

function planToEditable(plan: PhasePlan): EditablePhase[] {
  return plan.phases.map((p) => ({
    name: p.name,
    work_order_ids: p.work_order_ids || [],
    reasoning: p.reasoning || '',
    estimated_duration: p.estimated_duration || '',
    risks: p.risks || [],
    editingName: false,
  }))
}
