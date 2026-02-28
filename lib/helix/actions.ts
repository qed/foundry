'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getNextStep } from '@/config/helix-process'
import type { Json } from '@/types/database'

export async function completeHelixStep(
  projectId: string,
  stepKey: string,
  evidence: unknown,
  _artifactTitle?: string
) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
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
    throw new Error('Failed to complete step')
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

  // Revalidate helix pages
  revalidatePath(`/org/[orgSlug]/project/${projectId}/helix`, 'layout')
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
