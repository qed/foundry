'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { getStep } from '@/config/helix-process'

interface StepNavigationProps {
  orgSlug: string
  projectId: string
  /** The key of the previous step, if any */
  prevStepKey?: string
  /** The key of the next step, if any */
  nextStepKey?: string
  /** Whether the previous step is accessible (not locked) */
  canGoPrev?: boolean
  /** Whether the next step is accessible (current is complete + next is not locked) */
  canGoNext?: boolean
}

export default function StepNavigation({
  orgSlug,
  projectId,
  prevStepKey,
  nextStepKey,
  canGoPrev = true,
  canGoNext = false,
}: StepNavigationProps) {
  const prevConfig = prevStepKey ? getStep(prevStepKey) : undefined
  const nextConfig = nextStepKey ? getStep(nextStepKey) : undefined
  const basePath = `/org/${orgSlug}/project/${projectId}/helix/step`

  return (
    <div className="flex justify-between items-center pt-8 mt-8 border-t border-bg-tertiary">
      {/* Previous */}
      {prevConfig ? (
        <a
          href={canGoPrev ? `${basePath}/${prevConfig.key}` : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            canGoPrev
              ? 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              : 'text-text-secondary/40 cursor-not-allowed'
          }`}
          onClick={(e) => { if (!canGoPrev) e.preventDefault() }}
        >
          <ChevronLeft size={18} />
          <div className="text-left">
            <p className="text-xs text-text-secondary/60">Previous</p>
            <p className="text-sm">{prevConfig.key} — {prevConfig.title}</p>
          </div>
        </a>
      ) : (
        <div />
      )}

      {/* Next */}
      {nextConfig ? (
        <a
          href={canGoNext ? `${basePath}/${nextConfig.key}` : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            canGoNext
              ? 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              : 'text-text-secondary/40 cursor-not-allowed'
          }`}
          onClick={(e) => { if (!canGoNext) e.preventDefault() }}
        >
          <div className="text-right">
            <p className="text-xs text-text-secondary/60">Next</p>
            <p className="text-sm flex items-center gap-1.5 justify-end">
              {nextConfig.key} — {nextConfig.title}
              {!canGoNext && <Lock size={12} />}
            </p>
          </div>
          <ChevronRight size={18} />
        </a>
      ) : (
        <div />
      )}
    </div>
  )
}
