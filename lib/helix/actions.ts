'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getNextStep, getStep, getStageSteps } from '@/config/helix-process'
import { saveStepArtifact } from '@/lib/helix/step-artifacts'
import type { Json } from '@/types/database'

export interface CompleteStepResult {
  success: boolean
  error?: string
  artifactSaved?: boolean
  artifactError?: string
}

export async function completeHelixStep(
  projectId: string,
  stepKey: string,
  evidence: unknown,
  _artifactTitle?: string
): Promise<CompleteStepResult> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Update step as complete
  const { error: stepError } = await supabase
    .from('helix_steps')
    .update({
      status: 'complete' as const,
      evidence_data: evidence as Json,
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq('project_id', projectId)
    .eq('step_key', stepKey)

  if (stepError) {
    return { success: false, error: `Failed to complete step: ${stepError.message}` }
  }

  // Unlock next step
  const nextStepConfig = getNextStep(stepKey)
  if (nextStepConfig) {
    await supabase
      .from('helix_steps')
      .update({ status: 'active' as const })
      .eq('project_id', projectId)
      .eq('step_key', nextStepConfig.key)
      .eq('status', 'locked')
  }

  // Check if all steps in this stage are now complete — if so, pass the gate and unlock the next stage
  const currentStepConfig = getStep(stepKey)
  if (currentStepConfig) {
    const stageSteps = getStageSteps(currentStepConfig.stageNumber)
    const otherStepKeys = stageSteps
      .map((s) => s.key)
      .filter((k) => k !== stepKey)

    let allComplete = true
    if (otherStepKeys.length > 0) {
      const { data: otherSteps } = await supabase
        .from('helix_steps')
        .select('status')
        .eq('project_id', projectId)
        .in('step_key', otherStepKeys)

      allComplete = otherSteps?.every((s) => s.status === 'complete') ?? false
    }

    if (allComplete) {
      // Mark current stage gate as passed
      await supabase
        .from('helix_stage_gates')
        .update({
          status: 'passed' as const,
          passed_at: new Date().toISOString(),
          passed_by: user.id,
        })
        .eq('project_id', projectId)
        .eq('stage_number', currentStepConfig.stageNumber)

      // Unlock next stage gate
      await supabase
        .from('helix_stage_gates')
        .update({ status: 'active' as const })
        .eq('project_id', projectId)
        .eq('stage_number', currentStepConfig.stageNumber + 1)
        .eq('status', 'locked')
    }
  }

  // Await artifact save — pass the user's authenticated client
  let artifactResult: { saved: boolean; error?: string }
  try {
    artifactResult = await saveStepArtifact(projectId, stepKey, evidence, user.id, supabase)
  } catch (err) {
    artifactResult = { saved: false, error: `Threw: ${err}` }
  }

  // Revalidate helix pages
  revalidatePath(`/org/[orgSlug]/project/${projectId}/helix`, 'layout')

  if (!artifactResult.saved) {
    return {
      success: true,
      error: `Step completed but artifact save failed: ${artifactResult.error}`,
      artifactSaved: false,
      artifactError: artifactResult.error,
    }
  }

  return { success: true, artifactSaved: true }
}

export async function autoSaveStepEvidence(
  projectId: string,
  stepKey: string,
  evidence: unknown
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('helix_steps')
    .update({
      evidence_data: evidence as Json,
    })
    .eq('project_id', projectId)
    .eq('step_key', stepKey)

  if (error) {
    throw new Error('Failed to auto-save')
  }
}
