'use client'

import React from 'react'
import { CheckCircle2 } from 'lucide-react'

interface StageProgress {
  stageNumber: number
  stageTitle: string
  completedSteps: number
  totalSteps: number
}

interface ProgressBarProps {
  /** Progress data for a single stage */
  stage: StageProgress
  /** Whether this is the currently active stage */
  isActive?: boolean
}

export function ProgressBar({ stage, isActive = false }: ProgressBarProps) {
  const percentage = stage.totalSteps > 0
    ? Math.round((stage.completedSteps / stage.totalSteps) * 100)
    : 0
  const isComplete = percentage === 100

  return (
    <div className={`p-4 rounded-lg border ${
      isComplete
        ? 'border-green-500/30 bg-green-500/5'
        : isActive
          ? 'border-accent-cyan/30 bg-accent-cyan/5'
          : 'border-bg-tertiary bg-bg-secondary'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isComplete && <CheckCircle2 size={14} className="text-green-500" />}
          <span className={`text-sm font-medium ${
            isComplete ? 'text-green-400' : isActive ? 'text-accent-cyan' : 'text-text-primary'
          }`}>
            Stage {stage.stageNumber}: {stage.stageTitle}
          </span>
        </div>
        <span className="text-xs text-text-secondary">
          {stage.completedSteps} / {stage.totalSteps}
        </span>
      </div>
      <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isComplete
              ? 'bg-green-500'
              : isActive
                ? 'bg-accent-cyan'
                : 'bg-text-secondary/30'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface OverallProgressProps {
  /** Progress for all stages */
  stages: StageProgress[]
}

export function OverallProgress({ stages }: OverallProgressProps) {
  const totalCompleted = stages.reduce((sum, s) => sum + s.completedSteps, 0)
  const totalSteps = stages.reduce((sum, s) => sum + s.totalSteps, 0)
  const percentage = totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0

  return (
    <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Overall Progress</h3>
        <span className="text-lg font-bold text-accent-cyan">{percentage}%</span>
      </div>
      <div className="w-full h-3 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            percentage === 100 ? 'bg-green-500' : 'bg-accent-cyan'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-text-secondary mt-2">
        {totalCompleted} of {totalSteps} steps completed
      </p>
    </div>
  )
}
