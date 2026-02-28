'use client'

import { useHelixMode } from '@/lib/context/helix-mode-context'
import { STAGE_NUMBER_TO_SLUG } from '@/types/helix-routes'

const STAGE_TITLES: Record<number, string> = {
  1: 'Discovery',
  2: 'Requirements',
  3: 'Architecture',
  4: 'Implementation',
  5: 'Testing',
  6: 'Deployment',
  7: 'Monitoring',
  8: 'Retrospective',
}

export default function HelixDashboardPage() {
  const { stageProgress, stageGates, allSteps, isLoading } = useHelixMode()

  if (isLoading) {
    return null
  }

  const totalSteps = allSteps.length
  const completedSteps = allSteps.filter((s) => s.status === 'complete').length
  const overallPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Helix Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Track your structured development progress across all 8 stages.
        </p>
      </div>

      {/* Overall progress */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">Overall Progress</span>
          <span className="text-sm text-text-secondary">
            {completedSteps} / {totalSteps} steps ({overallPercentage}%)
          </span>
        </div>
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-cyan rounded-full transition-all duration-500"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* Stage cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((stageNum) => {
          const progress = stageProgress.find((p) => p.stageNumber === stageNum)
          const gate = stageGates.find((g) => g.stage_number === stageNum)
          const slug = STAGE_NUMBER_TO_SLUG[stageNum]
          const title = STAGE_TITLES[stageNum] || `Stage ${stageNum}`

          const percentage = progress?.percentage ?? 0
          const isActive = gate?.status === 'active'
          const isPassed = gate?.status === 'passed'
          const isLocked = gate?.status === 'locked'

          return (
            <div
              key={stageNum}
              className={`p-4 bg-bg-secondary border rounded-lg transition-colors ${
                isActive
                  ? 'border-accent-cyan'
                  : isPassed
                    ? 'border-green-500/50'
                    : 'border-border-default'
              } ${isLocked ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-text-secondary">
                  Stage {stageNum}
                </span>
                {isPassed && (
                  <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded">
                    Complete
                  </span>
                )}
                {isActive && (
                  <span className="text-xs px-1.5 py-0.5 bg-accent-cyan/10 text-accent-cyan rounded">
                    Active
                  </span>
                )}
                {isLocked && (
                  <span className="text-xs px-1.5 py-0.5 bg-bg-tertiary text-text-secondary rounded">
                    Locked
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
              <p className="text-xs text-text-secondary mb-3">
                {slug ? `/${slug}` : ''}
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>
                    {progress?.completedSteps ?? 0}/{progress?.totalSteps ?? 0} steps
                  </span>
                  <span>{percentage}%</span>
                </div>
                <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-cyan rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
