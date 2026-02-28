import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStep, getNextStep, getPreviousStep } from '@/config/helix-process'
import StepDetailView from '@/components/helix/StepDetailView'
import type { HelixStep, Json } from '@/types/database'

interface StepPageProps {
  params: Promise<{
    orgSlug: string
    projectId: string
    stepKey: string
  }>
}

export default async function StepPage({ params }: StepPageProps) {
  const { orgSlug, projectId, stepKey } = await params
  const supabase = await createClient()

  // Verify project access
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    redirect(`/org/${orgSlug}`)
  }

  // Validate step key against config
  const stepConfig = getStep(stepKey)
  if (!stepConfig) {
    redirect(`/org/${orgSlug}/project/${projectId}/helix`)
  }

  // Get step data from database
  const { data: step, error: stepError } = await supabase
    .from('helix_steps')
    .select('*')
    .eq('project_id', projectId)
    .eq('step_key', stepKey)
    .single()

  if (stepError || !step) {
    redirect(`/org/${orgSlug}/project/${projectId}/helix`)
  }

  // Determine navigation targets
  const prevStepConfig = getPreviousStep(stepKey)
  const nextStepConfig = getNextStep(stepKey)

  const basePath = `/org/${orgSlug}/project/${projectId}/helix/step`

  return (
    <StepDetailView
      step={step as HelixStep}
      stepKey={stepKey}
      onComplete={async (evidence: unknown) => {
        'use server'

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase
          .from('helix_steps')
          .update({
            status: 'complete' as const,
            evidence_data: evidence as Json,
            completed_at: new Date().toISOString(),
            completed_by: user?.id ?? null,
          })
          .eq('id', step.id)

        if (error) {
          throw new Error('Failed to save evidence')
        }

        // Unlock next step if exists
        if (nextStepConfig) {
          await supabase
            .from('helix_steps')
            .update({ status: 'active' as const })
            .eq('project_id', projectId)
            .eq('step_key', nextStepConfig.key)
            .eq('status', 'locked')
        }
      }}
      onNavigatePrev={prevStepConfig ? async () => {
        'use server'
        redirect(`${basePath}/${prevStepConfig.key}`)
      } : undefined}
      onNavigateNext={nextStepConfig ? async () => {
        'use server'
        redirect(`${basePath}/${nextStepConfig.key}`)
      } : undefined}
    />
  )
}
