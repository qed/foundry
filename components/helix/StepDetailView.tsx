'use client'

import React from 'react'
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import type { HelixStep } from '@/types/database'
import { getStep, getNextStep, getPreviousStep } from '@/config/helix-process'
import type { StepConfig } from '@/config/helix-process'
import EvidencePanel from './EvidencePanel'
import EvidenceViewer from './EvidenceViewer'
import BreadcrumbNav from './BreadcrumbNav'
import StepNavigation from './StepNavigation'
import StepHeaderNav from './StepHeaderNav'

interface StepDetailViewProps {
  step: HelixStep
  stepKey: string
  orgSlug: string
  projectId: string
  onComplete: (evidence: unknown) => Promise<void>
  /** Status of the next step (to determine if navigation is possible) */
  nextStepStatus?: string
  isLoading?: boolean
  error?: string
  /** Custom content to render in the left panel instead of the default instructions */
  children?: React.ReactNode
}

export default function StepDetailView({
  step,
  stepKey,
  orgSlug,
  projectId,
  onComplete,
  nextStepStatus,
  isLoading = false,
  error,
  children,
}: StepDetailViewProps) {
  const stepConfig: StepConfig | undefined = getStep(stepKey)
  const prevStepConfig = getPreviousStep(stepKey)
  const nextStepConfig = getNextStep(stepKey)

  if (!stepConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Step configuration not found for key: {stepKey}</div>
      </div>
    )
  }

  const isLocked = step.status === 'locked'
  const isComplete = step.status === 'complete'

  // Determine primary evidence type from config
  const primaryEvidenceType = stepConfig.evidenceRequirements[0]?.type ?? 'text'

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="mb-3">
            <BreadcrumbNav orgSlug={orgSlug} projectId={projectId} stepKey={stepKey} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {stepKey} — {stepConfig.title}
              </h1>
              <p className="text-text-secondary mt-1">
                Step {stepConfig.stepNumber} of 3 — Stage {stepConfig.stageNumber}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isLocked && (
                <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary rounded-lg">
                  <Lock size={16} className="text-text-secondary" />
                  <span className="text-sm text-text-secondary">Locked</span>
                </div>
              )}
              {isComplete && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 rounded-lg">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span className="text-sm text-green-500">Complete</span>
                </div>
              )}
              {step.status === 'active' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-accent-cyan/10 rounded-lg">
                  <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />
                  <span className="text-sm text-accent-cyan">Active</span>
                </div>
              )}
              <StepHeaderNav stepKey={stepKey} orgSlug={orgSlug} projectId={projectId} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel: Instructions or Custom Content */}
          <div className="lg:col-span-2">
            {children || (
              <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-8">
                {/* Description */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-text-primary mb-3">
                    Overview
                  </h2>
                  <p className="text-text-secondary leading-relaxed">
                    {stepConfig.description}
                  </p>
                </div>

                {/* Deliverables */}
                {stepConfig.deliverables.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-lg font-semibold text-text-primary mb-4">
                      Deliverables
                    </h2>
                    <div className="space-y-3">
                      {stepConfig.deliverables.map((deliverable, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-cyan/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-accent-cyan">
                              {idx + 1}
                            </span>
                          </div>
                          <p className="text-text-secondary leading-relaxed pt-1">
                            {deliverable}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence Requirements */}
                {stepConfig.evidenceRequirements.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-bg-tertiary">
                    <div className="flex gap-3 bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                      <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-300 mb-1">
                          Evidence Required
                        </p>
                        <ul className="text-sm text-blue-200/80 leading-relaxed space-y-1">
                          {stepConfig.evidenceRequirements.map((req, idx) => (
                            <li key={idx}>
                              {req.label}: {req.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Evidence Viewer (complete) or Evidence Submission (active) */}
          <div className="lg:col-span-1">
            {isComplete ? (
              <EvidenceViewer
                evidenceData={step.evidence_data}
                evidenceType={primaryEvidenceType}
                stepKey={stepKey}
                completedAt={step.completed_at}
              />
            ) : (
              <EvidencePanel
                step={step}
                stepKey={stepKey}
                evidenceType={primaryEvidenceType}
                onComplete={onComplete}
                isLoading={isLoading}
                isLocked={isLocked}
                error={error}
              />
            )}
          </div>
        </div>

        {/* Navigation */}
        <StepNavigation
          orgSlug={orgSlug}
          projectId={projectId}
          prevStepKey={prevStepConfig?.key}
          nextStepKey={nextStepConfig?.key}
          canGoPrev={!!prevStepConfig}
          canGoNext={isComplete && !!nextStepConfig && nextStepStatus !== 'locked'}
        />
      </div>
    </div>
  )
}
