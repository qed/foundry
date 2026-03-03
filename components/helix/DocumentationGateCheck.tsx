'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Shield,
} from 'lucide-react'
import {
  checkDocumentationGate,
} from '@/lib/helix/documentation-gate'
import type { DocumentationGateResult } from '@/lib/helix/documentation-gate'
import type { HelixStep } from '@/types/database'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocumentationGateCheckProps {
  projectId: string
  orgSlug: string
  steps: HelixStep[]
  onPassGate?: () => void
  onBack?: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentationGateCheck({
  projectId,
  orgSlug,
  steps,
  onPassGate,
  onBack,
}: DocumentationGateCheckProps) {
  const [isPassing, setIsPassing] = useState(false)
  const [passError, setPassError] = useState<string | null>(null)

  // Run gate check
  const gateResult = useMemo<DocumentationGateResult>(() => {
    const stepData = steps.map((s) => ({
      stepKey: s.step_key,
      status: s.status,
      evidenceData: s.evidence_data,
    }))
    return checkDocumentationGate(stepData)
  }, [steps])

  const canPass = gateResult.gateStatus === 'passed'

  const handlePassGate = useCallback(async () => {
    if (!canPass) return
    setPassError(null)

    try {
      setIsPassing(true)

      // Update the stage gate in the DB
      const response = await fetch('/api/helix/gate-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          checkType: 'pass-gate',
          stageNumber: 2,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setPassError(data.error ?? 'Failed to pass gate')
        return
      }

      onPassGate?.()
    } catch {
      setPassError('Failed to pass gate. Please try again.')
    } finally {
      setIsPassing(false)
    }
  }, [canPass, projectId, onPassGate])

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b border-bg-tertiary bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={24} className="text-accent-cyan" />
            <h1 className="text-2xl font-bold text-text-primary">
              Documentation Stage Gate
            </h1>
          </div>
          <p className="text-text-secondary">
            Before proceeding to Build Planning, verify your documentation is complete.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Progress Summary */}
        <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Gate Status
            </h2>
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${
                canPass
                  ? 'bg-green-900/30 text-green-400 border border-green-800/30'
                  : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/30'
              }`}
            >
              {canPass
                ? 'Ready for Build Planning'
                : `${gateResult.totalChecks - gateResult.passedChecks} check${
                    gateResult.totalChecks - gateResult.passedChecks !== 1 ? 's' : ''
                  } remaining`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                canPass ? 'bg-green-500' : 'bg-accent-cyan'
              }`}
              style={{
                width: `${Math.round(
                  (gateResult.passedChecks / gateResult.totalChecks) * 100
                )}%`,
              }}
            />
          </div>
          <p className="text-xs text-text-secondary mt-2">
            {gateResult.passedChecks} of {gateResult.totalChecks} checks passing
          </p>
        </div>

        {/* Step Completion Checks */}
        <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
            Step Completion
          </h2>
          <div className="space-y-3">
            {gateResult.stepChecks.map((check) => (
              <div
                key={check.stepKey}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {check.status === 'complete' ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : (
                    <XCircle size={20} className="text-red-400" />
                  )}
                  <div>
                    <p className="text-sm text-text-primary">
                      Step {check.stepKey}: {check.stepName}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {check.status === 'complete'
                        ? 'Complete'
                        : 'Not completed'}
                      {!check.evidencePresent && check.status === 'incomplete'
                        ? ' — no evidence'
                        : ''}
                    </p>
                  </div>
                </div>
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix/step/${check.stepKey}`}
                  className="text-xs text-accent-cyan hover:underline"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Checks */}
        <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
            Quality Requirements
          </h2>
          <div className="space-y-3">
            {gateResult.qualityChecks.map((check) => (
              <div
                key={check.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {check.status === 'pass' ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : (
                    <XCircle size={20} className="text-red-400" />
                  )}
                  <div>
                    <p className="text-sm text-text-primary">{check.name}</p>
                    <p className="text-xs text-text-secondary">{check.detail}</p>
                  </div>
                </div>
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix/step/${check.stepKey}`}
                  className="text-xs text-accent-cyan hover:underline"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Blocking Issues */}
        {gateResult.blockingIssues.length > 0 && (
          <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-400" />
              <h3 className="text-sm font-medium text-red-300">
                Blocking Issues
              </h3>
            </div>
            <ul className="space-y-1 ml-6">
              {gateResult.blockingIssues.map((issue, i) => (
                <li key={i} className="text-xs text-red-300/80 list-disc">
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pass Error */}
        {passError && (
          <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{passError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Documentation Stage
          </button>

          <button
            onClick={handlePassGate}
            disabled={!canPass || isPassing}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              canPass
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-bg-tertiary text-text-secondary cursor-not-allowed opacity-50'
            }`}
            title={
              canPass
                ? 'All checks passed — click to advance'
                : 'Complete all checks to pass the gate'
            }
          >
            {isPassing && <Loader2 size={18} className="animate-spin" />}
            {canPass ? 'Pass Gate & Continue' : 'Gate Blocked'}
          </button>
        </div>
      </div>
    </div>
  )
}
