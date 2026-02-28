'use client'

import { useHelixMode } from '@/lib/context/helix-mode-context'
import { HELIX_STAGES } from '@/config/helix-process'
import { HelixStageCard } from '@/components/helix/helix-stage-card'
import { HelixDashboardMetrics } from '@/components/helix/helix-dashboard-metrics'

export default function HelixDashboardPage() {
  const { stageProgress, stageGates, isLoading } = useHelixMode()

  if (isLoading) {
    return null
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Helix Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Track your structured development progress across all 8 stages.
        </p>
      </div>

      {/* Metrics */}
      <HelixDashboardMetrics />

      {/* Stage cards grid */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Stages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {HELIX_STAGES.map((stage) => {
            const progress = stageProgress.find((p) => p.stageNumber === stage.number)
            const gate = stageGates.find((g) => g.stage_number === stage.number)

            return (
              <HelixStageCard
                key={stage.number}
                stage={stage}
                gate={gate}
                completedSteps={progress?.completedSteps ?? 0}
                totalSteps={progress?.totalSteps ?? stage.steps.length}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
