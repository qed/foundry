'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { HelixStep } from '@/types/database'
import { completeHelixStep } from '@/lib/helix/actions'
import StepHeaderNav from '@/components/helix/StepHeaderNav'
import {
  calculateGaps,
  countGapsByStatus,
  allGapsAcknowledged,
  countUnacknowledgedGaps,
  buildVerificationEvidence,
  validateVerificationGate,
  extractInventoryCategories,
  extractUploadedFiles,
  GAP_REASONS,
  MAX_GAP_NOTES_LENGTH,
} from '@/lib/helix/documentation-verification'
import type { CategoryGap, GapReasonValue } from '@/lib/helix/documentation-verification'

// ─── Component ───────────────────────────────────────────────────────────────

interface Step2_4ContentProps {
  step: HelixStep
  projectId: string
  orgSlug: string
  inventoryEvidence: unknown
  filesEvidence: unknown
}

export default function Step2_4Content({
  step,
  projectId,
  orgSlug,
  inventoryEvidence,
  filesEvidence,
}: Step2_4ContentProps) {
  const isComplete = step.status === 'complete'

  // Extract data from prerequisite steps
  const inventoryCategories = useMemo(
    () => extractInventoryCategories(inventoryEvidence),
    [inventoryEvidence]
  )
  const uploadedFiles = useMemo(
    () => extractUploadedFiles(filesEvidence),
    [filesEvidence]
  )

  // Load existing acknowledgments from saved evidence
  const existingAcknowledgments = useMemo(() => {
    if (
      step.evidence_data &&
      typeof step.evidence_data === 'object' &&
      !Array.isArray(step.evidence_data)
    ) {
      const data = step.evidence_data as Record<string, unknown>
      if (data.evidence_type === 'documentation_verification') {
        const gaps = data.category_gaps as CategoryGap[] | undefined
        if (gaps) {
          const map: Record<string, { acknowledged: boolean; gap_reason: GapReasonValue | null; gap_notes: string }> = {}
          for (const g of gaps) {
            map[g.category_id] = {
              acknowledged: g.acknowledged,
              gap_reason: g.gap_reason,
              gap_notes: g.gap_notes,
            }
          }
          return map
        }
      }
    }
    return undefined
  }, [step.evidence_data])

  // Calculate gaps
  const [gaps, setGaps] = useState<CategoryGap[]>(() =>
    calculateGaps(inventoryCategories, uploadedFiles, existingAcknowledgments)
  )

  const [expandedGap, setExpandedGap] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const counts = useMemo(() => countGapsByStatus(gaps), [gaps])
  const unackedCount = useMemo(() => countUnacknowledgedGaps(gaps), [gaps])
  const allAcked = useMemo(() => allGapsAcknowledged(gaps), [gaps])

  const autoSaveEvidence = useCallback(
    async (currentGaps: CategoryGap[]) => {
      try {
        const evidence = buildVerificationEvidence(currentGaps)
        await fetch(
          `/api/helix/projects/${projectId}/steps/2.4/auto-save`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(evidence),
          }
        )
      } catch {
        // Silent fail for auto-save
      }
    },
    [projectId]
  )

  const handleAcknowledgeAndSave = useCallback(
    (categoryId: string, acknowledged: boolean, reason: GapReasonValue | null, notes: string) => {
      const updated = gaps.map((g) =>
        g.category_id === categoryId
          ? { ...g, acknowledged, gap_reason: reason, gap_notes: notes }
          : g
      )
      setGaps(updated)
      autoSaveEvidence(updated)
    },
    [gaps, autoSaveEvidence]
  )

  const handleComplete = async () => {
    setValidationError(null)
    const gateResult = validateVerificationGate(gaps)
    if (!gateResult.valid) {
      setValidationError(gateResult.error)
      return
    }

    try {
      setIsSaving(true)
      const evidence = buildVerificationEvidence(gaps)
      await completeHelixStep(projectId, '2.4', evidence, 'Documentation Verification')
    } catch {
      setValidationError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const gapStatusIcon = (status: CategoryGap['gap_status'], acknowledged: boolean) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 size={18} className="text-green-500" />
      case 'partial':
        return acknowledged
          ? <AlertCircle size={18} className="text-yellow-500" />
          : <AlertCircle size={18} className="text-yellow-400 animate-pulse" />
      case 'missing':
        return acknowledged
          ? <XCircle size={18} className="text-red-500" />
          : <XCircle size={18} className="text-red-400 animate-pulse" />
      default:
        return <Circle size={18} className="text-text-secondary opacity-50" />
    }
  }

  const gapStatusLabel = (status: CategoryGap['gap_status']) => {
    switch (status) {
      case 'complete': return 'Complete'
      case 'partial': return 'Partial'
      case 'missing': return 'Missing'
      default: return 'N/A'
    }
  }

  const gapStatusBg = (status: CategoryGap['gap_status']) => {
    switch (status) {
      case 'complete': return 'bg-green-900/20 border-green-800/30'
      case 'partial': return 'bg-yellow-900/20 border-yellow-800/30'
      case 'missing': return 'bg-red-900/20 border-red-800/30'
      default: return 'bg-bg-tertiary/30 border-bg-tertiary'
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Sticky Header */}
      <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              2.4 — Verify Documentation is Complete
            </h1>
            <p className="text-text-secondary mt-1">Step 4 of 4 — Documentation Stage</p>
          </div>
          <StepHeaderNav stepKey="2.4" orgSlug={orgSlug} projectId={projectId} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Completed Banner */}
            {isComplete && (
              <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-800/30 rounded-lg">
                <CheckCircle2 size={20} className="text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-300">
                    Verification completed on{' '}
                    {step.completed_at
                      ? new Date(step.completed_at).toLocaleDateString()
                      : 'unknown'}
                  </p>
                  <p className="text-xs text-green-300/70 mt-0.5">
                    Documentation Stage is now complete.
                  </p>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-2">Review Documentation Gaps</h2>
              <p className="text-text-secondary text-sm">
                Compare your documentation inventory (Step 2.1) with the files you uploaded (Step 2.3).
                Any missing or partial categories must be acknowledged before completing this step.
              </p>
            </div>

            {/* No inventory data */}
            {inventoryCategories.length === 0 && (
              <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-8 text-center">
                <AlertCircle size={32} className="mx-auto mb-2 text-yellow-400" />
                <p className="text-text-primary font-medium">No inventory data found</p>
                <p className="text-text-secondary text-sm mt-1">
                  Complete Step 2.1 to create your documentation inventory first.
                </p>
              </div>
            )}

            {/* Category Gap Rows */}
            {gaps.map((gap) => {
              const isExpanded = expandedGap === gap.category_id
              const needsAck = gap.gap_status === 'partial' || gap.gap_status === 'missing'

              return (
                <div
                  key={gap.category_id}
                  className={`rounded-lg border ${gapStatusBg(gap.gap_status)} overflow-hidden`}
                >
                  {/* Row Header */}
                  <button
                    onClick={() =>
                      needsAck
                        ? setExpandedGap(isExpanded ? null : gap.category_id)
                        : undefined
                    }
                    className={`w-full flex items-center gap-4 p-4 text-left ${
                      needsAck ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                    }`}
                  >
                    {gapStatusIcon(gap.gap_status, gap.acknowledged)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary">
                          {gap.category_name}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary">
                          {gapStatusLabel(gap.gap_status)}
                        </span>
                        {needsAck && gap.acknowledged && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan">
                            Acknowledged
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
                        <span>
                          Inventory: {gap.inventory_status === 'exists' ? 'Exists' : 'Not found'}
                          {gap.inventory_estimate > 0 && ` (≈${gap.inventory_estimate} files)`}
                        </span>
                        <span>Uploaded: {gap.files_uploaded} file{gap.files_uploaded !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {needsAck && (
                      isExpanded
                        ? <ChevronUp size={18} className="text-text-secondary" />
                        : <ChevronDown size={18} className="text-text-secondary" />
                    )}
                  </button>

                  {/* Acknowledgment Form (expanded) */}
                  {isExpanded && needsAck && (
                    <div className="border-t border-bg-tertiary/50 p-4 space-y-3">
                      {/* Checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gap.acknowledged}
                          onChange={(e) =>
                            handleAcknowledgeAndSave(
                              gap.category_id,
                              e.target.checked,
                              gap.gap_reason,
                              gap.gap_notes
                            )
                          }
                          className="w-4 h-4 rounded border-bg-tertiary accent-accent-cyan"
                        />
                        <span className="text-sm text-text-primary">
                          I acknowledge this gap
                        </span>
                      </label>

                      {/* Reason Dropdown */}
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          Reason
                        </label>
                        <select
                          value={gap.gap_reason ?? ''}
                          onChange={(e) =>
                            handleAcknowledgeAndSave(
                              gap.category_id,
                              gap.acknowledged,
                              (e.target.value || null) as GapReasonValue | null,
                              gap.gap_notes
                            )
                          }
                          className="w-full px-3 py-2 bg-bg-primary border border-bg-tertiary rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
                        >
                          <option value="">Select a reason...</option>
                          {GAP_REASONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          Notes (optional)
                        </label>
                        <input
                          type="text"
                          value={gap.gap_notes}
                          onChange={(e) =>
                            handleAcknowledgeAndSave(
                              gap.category_id,
                              gap.acknowledged,
                              gap.gap_reason,
                              e.target.value.slice(0, MAX_GAP_NOTES_LENGTH)
                            )
                          }
                          placeholder="Brief explanation..."
                          maxLength={MAX_GAP_NOTES_LENGTH}
                          className="w-full px-3 py-2 bg-bg-primary border border-bg-tertiary rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-cyan"
                        />
                        <p className="text-xs text-text-secondary mt-1">
                          {gap.gap_notes.length}/{MAX_GAP_NOTES_LENGTH}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right Panel — Summary */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Verification Summary</h3>

              {/* Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <CheckCircle2 size={14} className="text-green-500" /> Complete
                  </span>
                  <span className="text-text-primary font-medium">{counts.complete}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <AlertCircle size={14} className="text-yellow-500" /> Partial
                  </span>
                  <span className="text-text-primary font-medium">{counts.partial}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <XCircle size={14} className="text-red-500" /> Missing
                  </span>
                  <span className="text-text-primary font-medium">{counts.missing}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <Circle size={14} className="text-text-secondary opacity-50" /> N/A
                  </span>
                  <span className="text-text-primary font-medium">{counts.not_applicable}</span>
                </div>
              </div>

              {/* Progress Bar */}
              {gaps.length > 0 && (
                <div>
                  <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round(
                          ((counts.complete + counts.not_applicable) / gaps.length) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {counts.complete + counts.not_applicable} of {gaps.length} categories resolved
                  </p>
                </div>
              )}

              {/* Unacknowledged Gaps */}
              {unackedCount > 0 && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-800/30 rounded-lg">
                  <p className="text-sm text-yellow-300">
                    {unackedCount} gap{unackedCount !== 1 ? 's' : ''} need acknowledgment
                  </p>
                </div>
              )}

              {/* Validation Error */}
              {validationError && (
                <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{validationError}</p>
                </div>
              )}

              {/* All clear */}
              {allAcked && gaps.length > 0 && !isComplete && (
                <div className="p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
                  <p className="text-sm text-green-300">
                    All gaps acknowledged — ready to complete
                  </p>
                </div>
              )}

              <button
                onClick={handleComplete}
                disabled={isSaving || gaps.length === 0}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isComplete
                    ? 'border border-border-default text-text-secondary hover:text-text-primary hover:border-accent-cyan/50'
                    : 'bg-accent-cyan text-white hover:bg-opacity-90'
                }`}
              >
                {isSaving && <Loader2 size={20} className="animate-spin" />}
                {isComplete ? 'Re-verify' : 'Complete Verification'}
              </button>

              {!isComplete && (
                <p className="text-sm text-text-secondary">
                  Acknowledge all gaps, then click Complete to finish the Documentation Stage.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
