'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, Pencil, Trash2, AlertTriangle, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { WorkOrderPriority } from '@/types/database'

interface Blueprint {
  id: string
  title: string
  blueprint_type: string
  status: string
}

interface ExtractedWO {
  title: string
  description: string
  acceptance_criteria: string
  priority: WorkOrderPriority
  complexity: string
  source_blueprint_id?: string
  source_blueprint_title?: string
  feature_node_id?: string | null
  is_duplicate?: boolean
  accepted: boolean
  editing: boolean
}

interface ExtractWorkOrdersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onCreated: () => void
}

type Step = 'select' | 'extracting' | 'review' | 'creating' | 'done'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-accent-error',
  high: 'bg-accent-warning',
  medium: 'bg-accent-cyan',
  low: 'bg-text-tertiary',
}

export function ExtractWorkOrdersModal({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: ExtractWorkOrdersModalProps) {
  const [step, setStep] = useState<Step>('select')
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingBlueprints, setLoadingBlueprints] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedWO[]>([])
  const [extractError, setExtractError] = useState<string | null>(null)
  const [createResult, setCreateResult] = useState<{ count: number } | null>(null)

  // Fetch blueprints on open
  useEffect(() => {
    if (!open) return
    setStep('select')
    setSelectedIds(new Set())
    setExtracted([])
    setExtractError(null)
    setCreateResult(null)

    async function load() {
      setLoadingBlueprints(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/blueprints`)
        if (res.ok) {
          const data = await res.json()
          setBlueprints(data.blueprints || [])
        }
      } finally {
        setLoadingBlueprints(false)
      }
    }
    load()
  }, [open, projectId])

  const toggleBlueprint = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Extract work orders
  const handleExtract = useCallback(async () => {
    setStep('extracting')
    setExtractError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/work-orders/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprint_ids: Array.from(selectedIds) }),
      })

      if (!res.ok) {
        const data = await res.json()
        setExtractError(data.error || 'Extraction failed')
        setStep('select')
        return
      }

      const data = await res.json()
      const wos: ExtractedWO[] = (data.extracted_work_orders || []).map((wo: ExtractedWO) => ({
        ...wo,
        accepted: true,
        editing: false,
      }))

      setExtracted(wos)
      setStep('review')
    } catch {
      setExtractError('Network error during extraction')
      setStep('select')
    }
  }, [projectId, selectedIds])

  // Batch create
  const handleCreate = useCallback(async () => {
    const toCreate = extracted.filter((wo) => wo.accepted)
    if (toCreate.length === 0) return

    setStep('creating')

    try {
      const res = await fetch(`/api/projects/${projectId}/work-orders/batch-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_orders: toCreate.map((wo) => ({
            title: wo.title,
            description: wo.description,
            acceptance_criteria: wo.acceptance_criteria,
            priority: wo.priority,
            feature_node_id: wo.feature_node_id,
            source_blueprint_id: wo.source_blueprint_id,
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setCreateResult({ count: data.created_count })
        setStep('done')
        onCreated()
      } else {
        setExtractError('Failed to create work orders')
        setStep('review')
      }
    } catch {
      setExtractError('Network error during creation')
      setStep('review')
    }
  }, [projectId, extracted, onCreated])

  const acceptedCount = extracted.filter((wo) => wo.accepted).length

  const updateWO = (index: number, updates: Partial<ExtractedWO>) => {
    setExtracted((prev) => prev.map((wo, i) => (i === index ? { ...wo, ...updates } : wo)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Extract Work Orders from Blueprints'}
            {step === 'extracting' && 'Analyzing Blueprints...'}
            {step === 'review' && `Review Extracted Work Orders (${acceptedCount})`}
            {step === 'creating' && 'Creating Work Orders...'}
            {step === 'done' && 'Extraction Complete'}
          </DialogTitle>
        </DialogHeader>

        {/* Error display */}
        {extractError && (
          <div className="flex items-center gap-2 px-3 py-2 bg-accent-error/10 border border-accent-error/20 rounded-lg text-xs text-accent-error">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {extractError}
          </div>
        )}

        {/* Step 1: Blueprint selection */}
        {step === 'select' && (
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {loadingBlueprints ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
              </div>
            ) : blueprints.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">
                No blueprints found. Create blueprints in the Control Room first.
              </p>
            ) : (
              blueprints.map((bp) => (
                <label
                  key={bp.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                    selectedIds.has(bp.id)
                      ? 'border-accent-cyan/30 bg-accent-cyan/5'
                      : 'border-border-default hover:bg-bg-tertiary'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(bp.id)}
                    onChange={() => toggleBlueprint(bp.id)}
                    className="w-3.5 h-3.5 rounded border-border-default text-accent-cyan focus:ring-accent-cyan/30 bg-bg-primary"
                  />
                  <FileText className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium truncate">{bp.title}</p>
                    <p className="text-[10px] text-text-tertiary capitalize">{bp.blueprint_type.replace('_', ' ')} &middot; {bp.status}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        )}

        {/* Step 2: Extracting */}
        {step === 'extracting' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
            <p className="text-sm text-text-secondary">Analyzing {selectedIds.size} blueprint{selectedIds.size !== 1 ? 's' : ''}...</p>
            <p className="text-xs text-text-tertiary">This may take a few seconds</p>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {extracted.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">
                No work orders could be extracted. Try a different blueprint.
              </p>
            ) : (
              extracted.map((wo, i) => (
                <ExtractedCard
                  key={`${i}-${wo.editing ? 'edit' : 'view'}`}
                  wo={wo}
                  onToggleAccept={() => updateWO(i, { accepted: !wo.accepted })}
                  onToggleEdit={() => updateWO(i, { editing: !wo.editing })}
                  onUpdate={(updates) => updateWO(i, { ...updates, editing: false })}
                  onRemove={() => setExtracted((prev) => prev.filter((_, j) => j !== i))}
                />
              ))
            )}
          </div>
        )}

        {/* Step 4: Creating */}
        {step === 'creating' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
            <p className="text-sm text-text-secondary">Creating {acceptedCount} work order{acceptedCount !== 1 ? 's' : ''}...</p>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 'done' && createResult && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-accent-success/10 flex items-center justify-center">
              <Check className="w-6 h-6 text-accent-success" />
            </div>
            <p className="text-sm text-text-primary font-medium">
              Created {createResult.count} work order{createResult.count !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-text-tertiary">They&apos;ve been added to the backlog</p>
          </div>
        )}

        <DialogFooter>
          {step === 'select' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExtract}
                disabled={selectedIds.size === 0}
              >
                Extract from {selectedIds.size || 0} Blueprint{selectedIds.size !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {step === 'review' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={acceptedCount === 0}
              >
                Create {acceptedCount} Work Order{acceptedCount !== 1 ? 's' : ''}
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

/* ── Extracted Card ────────────────────────────────────────────── */

function ExtractedCard({
  wo,
  onToggleAccept,
  onToggleEdit,
  onUpdate,
  onRemove,
}: {
  wo: ExtractedWO
  onToggleAccept: () => void
  onToggleEdit: () => void
  onUpdate: (updates: Partial<ExtractedWO>) => void
  onRemove: () => void
}) {
  // Initialize edit state from current wo values — reset when editing is toggled on via key
  const [editTitle, setEditTitle] = useState(wo.title)
  const [editDesc, setEditDesc] = useState(wo.description)
  const [editCriteria, setEditCriteria] = useState(wo.acceptance_criteria)
  const [editPriority, setEditPriority] = useState(wo.priority)

  const acLines = wo.acceptance_criteria
    ? wo.acceptance_criteria.split('\n').filter((l) => l.trim()).length
    : 0

  if (wo.editing) {
    return (
      <div className="border border-accent-cyan/30 rounded-lg p-3 space-y-2 bg-bg-secondary">
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full bg-bg-primary border border-border-default rounded px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent-cyan"
          placeholder="Title"
        />
        <textarea
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          rows={3}
          className="w-full bg-bg-primary border border-border-default rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-cyan resize-none"
          placeholder="Description"
        />
        <textarea
          value={editCriteria}
          onChange={(e) => setEditCriteria(e.target.value)}
          rows={3}
          className="w-full bg-bg-primary border border-border-default rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-cyan resize-none"
          placeholder="Acceptance criteria (one per line)"
        />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-tertiary">Priority:</span>
          {(['critical', 'high', 'medium', 'low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setEditPriority(p)}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors',
                editPriority === p
                  ? 'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan'
                  : 'border-border-default text-text-secondary hover:text-text-primary'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_COLORS[p])} />
              <span className="capitalize">{p}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onToggleEdit}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => onUpdate({
              title: editTitle.trim(),
              description: editDesc,
              acceptance_criteria: editCriteria,
              priority: editPriority,
            })}
            disabled={!editTitle.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border rounded-lg p-3 transition-colors',
        !wo.accepted
          ? 'border-border-default/50 opacity-50'
          : wo.is_duplicate
            ? 'border-accent-warning/30 bg-accent-warning/5'
            : 'border-border-default'
      )}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={onToggleAccept}
          className={cn(
            'w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors',
            wo.accepted
              ? 'bg-accent-cyan border-accent-cyan text-bg-primary'
              : 'border-border-default'
          )}
        >
          {wo.accepted && <Check className="w-2.5 h-2.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-text-primary font-medium line-clamp-1 flex-1">{wo.title}</p>
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_COLORS[wo.priority])} />
          </div>
          {wo.description && (
            <p className="text-xs text-text-secondary line-clamp-2 mt-1">{wo.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-text-tertiary capitalize">{wo.priority}</span>
            {acLines > 0 && (
              <span className="text-[10px] text-text-tertiary">{acLines} AC</span>
            )}
            {wo.complexity && (
              <span className="text-[10px] text-text-tertiary capitalize">{wo.complexity}</span>
            )}
            {wo.source_blueprint_title && (
              <span className="text-[10px] text-accent-purple truncate max-w-[120px]">
                {wo.source_blueprint_title}
              </span>
            )}
          </div>
          {wo.is_duplicate && (
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-accent-warning">
              <AlertTriangle className="w-3 h-3" />
              Similar work order may already exist
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleEdit}
            className="p-1 text-text-tertiary hover:text-text-primary transition-colors rounded"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-text-tertiary hover:text-accent-error transition-colors rounded"
            title="Remove"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
