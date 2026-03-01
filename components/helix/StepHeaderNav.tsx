'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getNextStep, getPreviousStep } from '@/config/helix-process'

interface StepHeaderNavProps {
  stepKey: string
  orgSlug: string
  projectId: string
}

export default function StepHeaderNav({ stepKey, orgSlug, projectId }: StepHeaderNavProps) {
  const prev = getPreviousStep(stepKey)
  const next = getNextStep(stepKey)
  const basePath = `/org/${orgSlug}/project/${projectId}/helix/step`

  return (
    <div className="flex items-center gap-1">
      {prev ? (
        <a
          href={`${basePath}/${prev.key}`}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title={`${prev.key} — ${prev.title}`}
        >
          <ChevronLeft size={20} />
        </a>
      ) : (
        <span className="p-2 text-text-secondary/30">
          <ChevronLeft size={20} />
        </span>
      )}
      {next ? (
        <a
          href={`${basePath}/${next.key}`}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title={`${next.key} — ${next.title}`}
        >
          <ChevronRight size={20} />
        </a>
      ) : (
        <span className="p-2 text-text-secondary/30">
          <ChevronRight size={20} />
        </span>
      )}
    </div>
  )
}
