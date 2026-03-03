import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStep, getNextStep } from '@/config/helix-process'
import StepDetailView from '@/components/helix/StepDetailView'
import Step1_1Content from '@/components/helix/steps/Step1_1Content'
import Step1_2Content from '@/components/helix/steps/Step1_2Content'
import Step1_3Content from '@/components/helix/steps/Step1_3Content'
import Step2_1Content from '@/components/helix/steps/Step2_1Content'
import Step2_2Content from '@/components/helix/steps/Step2_2Content'
import Step2_3Content from '@/components/helix/steps/Step2_3Content'
import Step2_4Content from '@/components/helix/steps/Step2_4Content'
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

  // Verify project access and get org name
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, org_id, organizations(name)')
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

  const typedStep = step as HelixStep

  // Step-specific custom components
  if (stepKey === '1.1') {
    return (
      <Step1_1Content
        step={typedStep}
        projectId={projectId}
        orgSlug={orgSlug}
      />
    )
  }

  if (stepKey === '1.2') {
    // Verify Step 1.1 is complete before allowing 1.2
    const { data: step1_1 } = await supabase
      .from('helix_steps')
      .select('status')
      .eq('project_id', projectId)
      .eq('step_key', '1.1')
      .single()

    if (!step1_1 || step1_1.status !== 'complete') {
      redirect(`/org/${orgSlug}/project/${projectId}/helix/step/1.1`)
    }

    const orgData = project.organizations as unknown as { name: string } | null
    const companyName = orgData?.name || ''

    return (
      <Step1_2Content
        step={typedStep}
        projectId={projectId}
        orgSlug={orgSlug}
        companyName={companyName}
      />
    )
  }

  if (stepKey === '1.3') {
    // Verify Step 1.2 is complete
    const { data: step1_2 } = await supabase
      .from('helix_steps')
      .select('status')
      .eq('project_id', projectId)
      .eq('step_key', '1.2')
      .single()

    if (!step1_2 || step1_2.status !== 'complete') {
      redirect(`/org/${orgSlug}/project/${projectId}/helix/step/1.2`)
    }

    return (
      <Step1_3Content
        step={typedStep}
        projectId={projectId}
        orgSlug={orgSlug}
      />
    )
  }

  if (stepKey === '2.1') {
    // Verify Stage 1 is complete (Step 1.3 done)
    const { data: step1_3 } = await supabase
      .from('helix_steps')
      .select('status')
      .eq('project_id', projectId)
      .eq('step_key', '1.3')
      .single()

    if (!step1_3 || step1_3.status !== 'complete') {
      redirect(`/org/${orgSlug}/project/${projectId}/helix/step/1.3`)
    }

    return (
      <Step2_1Content
        step={typedStep}
        projectId={projectId}
        orgSlug={orgSlug}
      />
    )
  }

  if (stepKey === '2.2') {
    // Verify Step 2.1 is complete
    const { data: step2_1 } = await supabase
      .from('helix_steps')
      .select('status')
      .eq('project_id', projectId)
      .eq('step_key', '2.1')
      .single()

    if (!step2_1 || step2_1.status !== 'complete') {
      redirect(`/org/${orgSlug}/project/${projectId}/helix/step/2.1`)
    }

    return (
      <Step2_2Content
        step={typedStep}
        projectId={projectId}
        orgSlug={orgSlug}
      />
    )
  }

  if (stepKey === '2.3') {
    // Verify Step 2.2 is complete
    const { data: step2_2 } = await supabase
      .from('helix_steps')
      .select('status')
      .eq('project_id', projectId)
      .eq('step_key', '2.2')
      .single()

    if (!step2_2 || step2_2.status !== 'complete') {
      redirect(`/org/${orgSlug}/project/${projectId}/helix/step/2.2`)
    }

    return (
      <Step2_3Content
        step={typedStep}
        projectId={projectId}
        orgSlug={orgSlug}
      />
    )
  }

  if (stepKey === '2.4') {
    // Verify Step 2.3 is complete
    const { data: step2_3 } = await supabase
      .from('helix_steps')
      .select('status')
      .eq('project_id', projectId)
      .eq('step_key', '2.3')
      .single()

    if (!step2_3 || step2_3.status !== 'complete') {
      redirect(`/org/${orgSlug}/project/${projectId}/helix/step/2.3`)
    }

    // Load evidence from prerequisite steps
    const { data: step2_1 } = await supabase
      .from('helix_steps')
      .select('evidence_data')
      .eq('project_id', projectId)
      .eq('step_key', '2.1')
      .single()

    const { data: step2_3Files } = await supabase
      .from('helix_steps')
      .select('evidence_data')
      .eq('project_id', projectId)
      .eq('step_key', '2.3')
      .single()

    return (
      <Step2_4Content
        step={typedStep}
        projectId={projectId}
        orgSlug={orgSlug}
        inventoryEvidence={step2_1?.evidence_data}
        filesEvidence={step2_3Files?.evidence_data}
      />
    )
  }

  // Generic step detail view for all other steps
  const nextStepConfig = getNextStep(stepKey)

  // Get next step status for navigation
  let nextStepStatus: string | undefined
  if (nextStepConfig) {
    const { data: nextStepData } = await supabase
      .from('helix_steps')
      .select('status')
      .eq('project_id', projectId)
      .eq('step_key', nextStepConfig.key)
      .single()
    nextStepStatus = nextStepData?.status ?? undefined
  }

  return (
    <StepDetailView
      step={typedStep}
      stepKey={stepKey}
      orgSlug={orgSlug}
      projectId={projectId}
      nextStepStatus={nextStepStatus}
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

        if (nextStepConfig) {
          await supabase
            .from('helix_steps')
            .update({ status: 'active' as const })
            .eq('project_id', projectId)
            .eq('step_key', nextStepConfig.key)
            .eq('status', 'locked')
        }
      }}
    />
  )
}
