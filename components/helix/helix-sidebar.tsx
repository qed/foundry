'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useHelixMode } from '@/lib/context/helix-mode-context'
import { useProject } from '@/lib/context/project-context'
import { useOrg } from '@/lib/context/org-context'
import { helixRoutes, STAGE_NUMBER_TO_SLUG } from '@/types/helix-routes'
import {
  ChevronDown,
  ChevronRight,
  Lock,
  CheckCircle2,
  Circle,
  Compass,
  FileText,
  ClipboardList,
  FolderGit2,
  CheckSquare,
  Hammer,
  TestTube2,
  Rocket,
} from 'lucide-react'

const STAGE_CONFIG: {
  number: number
  title: string
  icon: typeof Compass
}[] = [
  { number: 1, title: 'Planning', icon: Compass },
  { number: 2, title: 'Documentation', icon: FileText },
  { number: 3, title: 'Build Planning', icon: ClipboardList },
  { number: 4, title: 'Repo Setup', icon: FolderGit2 },
  { number: 5, title: 'Pre-Build Review', icon: CheckSquare },
  { number: 6, title: 'Build', icon: Hammer },
  { number: 7, title: 'Testing', icon: TestTube2 },
  { number: 8, title: 'Deployment', icon: Rocket },
]

interface HelixSidebarProps {
  onClose?: () => void
}

export function HelixSidebar({ onClose }: HelixSidebarProps) {
  const { allSteps, stageGates, stageProgress } = useHelixMode()
  const { project } = useProject()
  const { org } = useOrg()
  const pathname = usePathname()
  const [expandedStages, setExpandedStages] = useState<Set<number>>(
    () => {
      // Auto-expand the active stage
      const activeGate = stageGates.find((g) => g.status === 'active')
      return new Set(activeGate ? [activeGate.stage_number] : [1])
    }
  )

  const toggleStage = (stageNum: number) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stageNum)) {
        next.delete(stageNum)
      } else {
        next.add(stageNum)
      }
      return next
    })
  }

  const dashboardUrl = helixRoutes.dashboard(org.slug, project.id)
  const isDashboardActive = pathname === dashboardUrl

  return (
    <div className="w-64 h-full bg-bg-secondary border-r border-border-default flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border-default">
        <Link
          href={dashboardUrl}
          onClick={onClose}
          className={`block text-sm font-semibold transition-colors ${
            isDashboardActive ? 'text-accent-cyan' : 'text-text-primary hover:text-accent-cyan'
          }`}
        >
          Helix Dashboard
        </Link>
        <p className="text-xs text-text-secondary mt-0.5">
          Structured Development Process
        </p>
      </div>

      {/* Stage list */}
      <nav className="flex-1 overflow-y-auto py-2">
        {STAGE_CONFIG.map((stage) => {
          const gate = stageGates.find((g) => g.stage_number === stage.number)
          const progress = stageProgress.find((p) => p.stageNumber === stage.number)
          const stageSteps = allSteps.filter((s) => s.stage_number === stage.number)
          const isExpanded = expandedStages.has(stage.number)
          const isLocked = gate?.status === 'locked'
          const isPassed = gate?.status === 'passed'
          const isActive = gate?.status === 'active'
          const stageSlug = STAGE_NUMBER_TO_SLUG[stage.number]
          const StageIcon = stage.icon

          return (
            <div key={stage.number}>
              {/* Stage header */}
              <button
                onClick={() => toggleStage(stage.number)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-bg-tertiary ${
                  isLocked ? 'opacity-50' : ''
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                )}
                <StageIcon className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-accent-cyan' : isPassed ? 'text-green-400' : 'text-text-secondary'
                }`} />
                <span className={`flex-1 text-left truncate ${
                  isActive ? 'text-text-primary font-medium' : 'text-text-secondary'
                }`}>
                  {stage.title}
                </span>
                {progress && (
                  <span className="text-xs text-text-secondary">
                    {progress.completedSteps}/{progress.totalSteps}
                  </span>
                )}
              </button>

              {/* Steps */}
              {isExpanded && (
                <div className="ml-5 border-l border-border-default">
                  {stageSteps.map((step) => {
                    const stepUrl = helixRoutes.step(
                      org.slug,
                      project.id,
                      stageSlug,
                      step.step_key
                    )
                    const isStepActive = pathname === stepUrl

                    return (
                      <Link
                        key={step.step_key}
                        href={step.status === 'locked' ? '#' : stepUrl}
                        onClick={step.status !== 'locked' ? onClose : undefined}
                        className={`flex items-center gap-2 pl-4 pr-3 py-1.5 text-xs transition-colors ${
                          isStepActive
                            ? 'bg-accent-cyan/10 text-accent-cyan border-l-2 border-accent-cyan -ml-px'
                            : step.status === 'locked'
                              ? 'text-text-secondary/50 cursor-not-allowed'
                              : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                        }`}
                      >
                        {step.status === 'locked' && (
                          <Lock className="w-3 h-3 shrink-0" />
                        )}
                        {step.status === 'active' && (
                          <Circle className="w-3 h-3 shrink-0 text-accent-cyan" />
                        )}
                        {step.status === 'complete' && (
                          <CheckCircle2 className="w-3 h-3 shrink-0 text-green-400" />
                        )}
                        <span className="truncate">
                          Step {step.step_key}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}
