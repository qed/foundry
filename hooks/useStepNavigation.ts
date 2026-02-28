'use client'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useHelixMode } from '@/lib/context/helix-mode-context'
import { useProject } from '@/lib/context/project-context'
import { useOrg } from '@/lib/context/org-context'
import { helixRoutes, STAGE_NUMBER_TO_SLUG } from '@/types/helix-routes'
import type { HelixStep } from '@/types/database'

interface StepNavigationResult {
  currentStep: HelixStep | null
  nextStep: HelixStep | null
  previousStep: HelixStep | null
  goToStep: (stepKey: string) => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  canGoNext: boolean
  canGoPrevious: boolean
}

export function useStepNavigation(activeStepKey?: string): StepNavigationResult {
  const { allSteps } = useHelixMode()
  const { project } = useProject()
  const { org } = useOrg()
  const router = useRouter()

  const sortedSteps = useMemo(
    () =>
      [...allSteps].sort((a, b) => {
        if (a.stage_number !== b.stage_number) return a.stage_number - b.stage_number
        return a.step_number - b.step_number
      }),
    [allSteps]
  )

  const currentIndex = useMemo(
    () => (activeStepKey ? sortedSteps.findIndex((s) => s.step_key === activeStepKey) : -1),
    [sortedSteps, activeStepKey]
  )

  const currentStep = currentIndex >= 0 ? sortedSteps[currentIndex] : null
  const nextStep = currentIndex >= 0 && currentIndex < sortedSteps.length - 1
    ? sortedSteps[currentIndex + 1]
    : null
  const previousStep = currentIndex > 0 ? sortedSteps[currentIndex - 1] : null

  const navigateToStep = useCallback(
    (step: HelixStep) => {
      const stageSlug = STAGE_NUMBER_TO_SLUG[step.stage_number]
      if (!stageSlug) return
      const url = helixRoutes.step(org.slug, project.id, stageSlug, step.step_key)
      router.push(url)
    },
    [org.slug, project.id, router]
  )

  const goToStep = useCallback(
    (stepKey: string) => {
      const step = sortedSteps.find((s) => s.step_key === stepKey)
      if (step && step.status !== 'locked') {
        navigateToStep(step)
      }
    },
    [sortedSteps, navigateToStep]
  )

  const goToNextStep = useCallback(() => {
    if (nextStep && nextStep.status !== 'locked') {
      navigateToStep(nextStep)
    }
  }, [nextStep, navigateToStep])

  const goToPreviousStep = useCallback(() => {
    if (previousStep) {
      navigateToStep(previousStep)
    }
  }, [previousStep, navigateToStep])

  return {
    currentStep,
    nextStep,
    previousStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    canGoNext: !!nextStep && nextStep.status !== 'locked',
    canGoPrevious: !!previousStep,
  }
}
