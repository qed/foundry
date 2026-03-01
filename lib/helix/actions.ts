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
  diagnostics: string[]
}

export async function completeHelixStep(
  projectId: string,
  stepKey: string,
  evidence: unknown,
  _artifactTitle?: string
): Promise<CompleteStepResult> {
  const diag: string[] = []
  diag.push(`[${new Date().toISOString()}] completeHelixStep called: project=${projectId}, step=${stepKey}`)
  diag.push(`Evidence keys: ${evidence && typeof evidence === 'object' ? Object.keys(evidence as Record<string, unknown>).join(', ') : 'none'}`)

  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    diag.push(`Auth failed: ${authError?.message ?? 'no user'}`)
    return { success: false, error: 'Not authenticated', diagnostics: diag }
  }
  diag.push(`Authenticated as user ${user.id.slice(0, 8)}...`)

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
    diag.push(`Step update FAILED: ${stepError.message}`)
    return { success: false, error: `Failed to complete step: ${stepError.message}`, diagnostics: diag }
  }
  diag.push('Step update OK')

  // Unlock next step
  const nextStepConfig = getNextStep(stepKey)
  if (nextStepConfig) {
    await supabase
      .from('helix_steps')
      .update({ status: 'active' as const })
      .eq('project_id', projectId)
      .eq('step_key', nextStepConfig.key)
      .eq('status', 'locked')
    diag.push(`Unlocked next step: ${nextStepConfig.key}`)
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
      await supabase
        .from('helix_stage_gates')
        .update({
          status: 'passed' as const,
          passed_at: new Date().toISOString(),
          passed_by: user.id,
        })
        .eq('project_id', projectId)
        .eq('stage_number', currentStepConfig.stageNumber)

      await supabase
        .from('helix_stage_gates')
        .update({ status: 'active' as const })
        .eq('project_id', projectId)
        .eq('stage_number', currentStepConfig.stageNumber + 1)
        .eq('status', 'locked')
      diag.push('All stage steps complete — gates updated')
    }
  }

  // Await artifact save — pass the user's authenticated client
  diag.push('Starting artifact save...')
  let artifactResult: { saved: boolean; error?: string; diagnostics?: string[] }
  try {
    artifactResult = await saveStepArtifact(projectId, stepKey, evidence, user.id, supabase)
  } catch (err) {
    artifactResult = { saved: false, error: `Threw: ${err}` }
  }

  if (artifactResult.diagnostics) {
    diag.push(...artifactResult.diagnostics)
  }
  diag.push(`Artifact result: saved=${artifactResult.saved}, error=${artifactResult.error ?? 'none'}`)

  // Revalidate helix pages
  revalidatePath(`/org/[orgSlug]/project/${projectId}/helix`, 'layout')
  diag.push('revalidatePath called')

  if (!artifactResult.saved) {
    return {
      success: true,
      error: `Step completed but artifact save failed: ${artifactResult.error}`,
      artifactSaved: false,
      artifactError: artifactResult.error,
      diagnostics: diag,
    }
  }

  return { success: true, artifactSaved: true, diagnostics: diag }
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
