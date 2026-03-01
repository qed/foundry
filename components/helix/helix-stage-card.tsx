'use client'

import Link from 'next/link'
import { useProject } from '@/lib/context/project-context'
import { useOrg } from '@/lib/context/org-context'
import { helixRoutes } from '@/types/helix-routes'
import type { StageConfig } from '@/config/helix-process'
import type { HelixStageGate } from '@/types/database'
import {
  Lock,
  CheckCircle2,
  PlayCircle,
  Compass,
  FileText,
  ClipboardList,
  FolderGit2,
  CheckSquare,
  Hammer,
  TestTube2,
  Rocket,
} from 'lucide-react'

const STAGE_ICONS: Record<number, typeof Compass> = {
  1: Compass,
  2: FileText,
  3: ClipboardList,
  4: FolderGit2,
  5: CheckSquare,
  6: Hammer,
  7: TestTube2,
  8: Rocket,
}

interface HelixStageCardProps {
  stage: StageConfig
  gate: HelixStageGate | undefined
  completedSteps: number
  totalSteps: number
}

export function HelixStageCard({ stage, gate, completedSteps, totalSteps }: HelixStageCardProps) {
  const { project } = useProject()
  const { org } = useOrg()

  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const isActive = gate?.status === 'active'
  const isPassed = gate?.status === 'passed'
  const isLocked = gate?.status === 'locked'
  const Icon = STAGE_ICONS[stage.number] || Compass

  const stageUrl = helixRoutes.stage(
    org.slug,
    project.id,
    stage.slug as Parameters<typeof helixRoutes.stage>[2]
  )

  const content = (
    <div
      className={`group p-5 bg-bg-secondary border rounded-lg transition-all ${
        isActive
          ? 'border-accent-cyan shadow-sm shadow-accent-cyan/10 hover:shadow-md hover:shadow-accent-cyan/20'
          : isPassed
            ? 'border-green-500/50 hover:border-green-500/70'
            : 'border-border-default'
      } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent-cyan/50 cursor-pointer'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg ${
              isActive
                ? 'bg-accent-cyan/10'
                : isPassed
                  ? 'bg-green-500/10'
                  : 'bg-bg-tertiary'
            }`}
          >
            <Icon
              className={`w-5 h-5 ${
                isActive
                  ? 'text-accent-cyan'
                  : isPassed
                    ? 'text-green-400'
                    : 'text-text-secondary'
              }`}
            />
          </div>
          <div>
            <span className="text-xs font-mono text-text-secondary">Stage {stage.number}</span>
            <h3 className="text-sm font-semibold text-text-primary">{stage.title}</h3>
          </div>
        </div>

        {/* Status badge */}
        <div>
          {isPassed && <CheckCircle2 className="w-5 h-5 text-green-400" />}
          {isActive && <PlayCircle className="w-5 h-5 text-accent-cyan" />}
          {isLocked && <Lock className="w-5 h-5 text-text-secondary/50" />}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-text-secondary mb-4 line-clamp-2">{stage.description}</p>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">
            {completedSteps}/{totalSteps} steps
          </span>
          <span
            className={
              isPassed
                ? 'text-green-400'
                : isActive
                  ? 'text-accent-cyan'
                  : 'text-text-secondary'
            }
          >
            {percentage}%
          </span>
        </div>
        <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isPassed ? 'bg-green-400' : 'bg-accent-cyan'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )

  if (isLocked) {
    return content
  }

  return (
    <Link href={stageUrl}>
      {content}
    </Link>
  )
}
