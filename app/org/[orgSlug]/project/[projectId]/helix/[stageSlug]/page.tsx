'use client'

import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useHelixMode } from '@/lib/context/helix-mode-context'
import { useProject } from '@/lib/context/project-context'
import { useOrg } from '@/lib/context/org-context'
import { HELIX_STAGES } from '@/config/helix-process'
import {
  isValidStageSlug,
  STAGE_SLUG_TO_NUMBER,
  helixRoutes,
} from '@/types/helix-routes'
import {
  Lock,
  CheckCircle2,
  Circle,
  ArrowLeft,
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

interface StagePageProps {
  params: Promise<{
    orgSlug: string
    projectId: string
    stageSlug: string
  }>
}

export default function StagePage({ params }: StagePageProps) {
  const { orgSlug, stageSlug } = use(params)
  const { org } = useOrg()
  const { project } = useProject()
  const { allSteps, stageGates, isLoading } = useHelixMode()

  if (!isValidStageSlug(stageSlug)) {
    notFound()
  }

  const stageNumber = STAGE_SLUG_TO_NUMBER[stageSlug]
  const stageConfig = HELIX_STAGES.find((s) => s.number === stageNumber)

  if (!stageConfig) {
    notFound()
  }

  if (isLoading) {
    return null
  }

  const gate = stageGates.find((g) => g.stage_number === stageNumber)
  const stageSteps = allSteps.filter((s) => s.stage_number === stageNumber)
  const Icon = STAGE_ICONS[stageNumber] || Compass
  const dashboardUrl = helixRoutes.dashboard(org.slug, project.id)

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href={dashboardUrl}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Stage header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-accent-cyan/10">
          <Icon className="w-6 h-6 text-accent-cyan" />
        </div>
        <div>
          <span className="text-xs font-mono text-text-secondary">
            Stage {stageNumber}
          </span>
          <h1 className="text-2xl font-bold text-text-primary">
            {stageConfig.title}
          </h1>
          <p className="text-text-secondary mt-1">{stageConfig.description}</p>
        </div>
      </div>

      {/* Steps list */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Steps</h2>
        <div className="space-y-2">
          {stageSteps.map((step) => {
            const stepUrl = helixRoutes.step(org.slug, project.id, step.step_key)
            const stepConfig = stageConfig.steps.find(
              (s) => s.key === step.step_key
            )
            const isLocked = step.status === 'locked'
            const isComplete = step.status === 'complete'

            const inner = (
              <div
                className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                  isComplete
                    ? 'border-green-500/30 bg-green-500/5'
                    : isLocked
                      ? 'border-border-default opacity-50 cursor-not-allowed'
                      : 'border-border-default hover:border-accent-cyan/50 hover:bg-bg-tertiary'
                }`}
              >
                {isLocked && <Lock className="w-4 h-4 text-text-secondary/50 shrink-0" />}
                {step.status === 'active' && (
                  <Circle className="w-4 h-4 text-accent-cyan shrink-0" />
                )}
                {isComplete && (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">
                    Step {step.step_key}: {stepConfig?.title ?? ''}
                  </div>
                  {stepConfig?.description && (
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                      {stepConfig.description}
                    </p>
                  )}
                </div>
              </div>
            )

            if (isLocked) {
              return <div key={step.step_key}>{inner}</div>
            }

            return (
              <Link key={step.step_key} href={stepUrl}>
                {inner}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
