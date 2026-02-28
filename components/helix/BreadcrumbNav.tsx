'use client'

import React from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { getStep, getStage } from '@/config/helix-process'

interface BreadcrumbNavProps {
  orgSlug: string
  projectId: string
  stepKey: string
}

export default function BreadcrumbNav({ orgSlug, projectId, stepKey }: BreadcrumbNavProps) {
  const stepConfig = getStep(stepKey)
  const stageConfig = stepConfig ? getStage(stepConfig.stageNumber) : undefined

  const helixUrl = `/org/${orgSlug}/project/${projectId}/helix`

  return (
    <nav className="flex items-center gap-1.5 text-sm text-text-secondary overflow-x-auto">
      <a
        href={helixUrl}
        className="flex items-center gap-1.5 hover:text-text-primary transition-colors whitespace-nowrap"
      >
        <Home size={14} />
        Helix
      </a>

      {stageConfig && (
        <>
          <ChevronRight size={14} className="text-text-secondary/50 flex-shrink-0" />
          <span className="whitespace-nowrap">
            Stage {stageConfig.number}: {stageConfig.title}
          </span>
        </>
      )}

      {stepConfig && (
        <>
          <ChevronRight size={14} className="text-text-secondary/50 flex-shrink-0" />
          <span className="text-text-primary font-medium whitespace-nowrap">
            {stepConfig.key} — {stepConfig.title}
          </span>
        </>
      )}
    </nav>
  )
}
