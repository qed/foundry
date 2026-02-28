'use client'

import { useHelixMode } from '@/lib/context/helix-mode-context'
import { getTotalSteps } from '@/config/helix-process'
import { CheckCircle2, PlayCircle, Lock, TrendingUp } from 'lucide-react'

export function HelixDashboardMetrics() {
  const { allSteps, stageGates } = useHelixMode()

  const totalSteps = getTotalSteps()
  const completedSteps = allSteps.filter((s) => s.status === 'complete').length
  const activeSteps = allSteps.filter((s) => s.status === 'active').length
  const lockedSteps = allSteps.filter((s) => s.status === 'locked').length
  const passedGates = stageGates.filter((g) => g.status === 'passed').length
  const overallPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  const metrics = [
    {
      label: 'Completed Steps',
      value: completedSteps,
      total: totalSteps,
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Active Steps',
      value: activeSteps,
      total: undefined,
      icon: PlayCircle,
      color: 'text-accent-cyan',
      bgColor: 'bg-accent-cyan/10',
    },
    {
      label: 'Locked Steps',
      value: lockedSteps,
      total: undefined,
      icon: Lock,
      color: 'text-text-secondary',
      bgColor: 'bg-bg-tertiary',
    },
    {
      label: 'Gates Passed',
      value: passedGates,
      total: 8,
      icon: TrendingUp,
      color: 'text-accent-cyan',
      bgColor: 'bg-accent-cyan/10',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">Overall Progress</span>
          <span className="text-sm text-text-secondary">
            {completedSteps} / {totalSteps} steps ({overallPercentage}%)
          </span>
        </div>
        <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-cyan rounded-full transition-all duration-700"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((metric) => {
          const MetricIcon = metric.icon
          return (
            <div
              key={metric.label}
              className="bg-bg-secondary border border-border-default rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded ${metric.bgColor}`}>
                  <MetricIcon className={`w-4 h-4 ${metric.color}`} />
                </div>
              </div>
              <div className="text-xl font-bold text-text-primary">
                {metric.value}
                {metric.total !== undefined && (
                  <span className="text-sm font-normal text-text-secondary">
                    /{metric.total}
                  </span>
                )}
              </div>
              <div className="text-xs text-text-secondary mt-0.5">{metric.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
