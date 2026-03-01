'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getNextStep, getStep, getStageSteps } from '@/config/helix-process'
import type { Json } from '@/types/database'

/**
 * Convert step evidence to markdown text for artifact storage.
 * Returns null if there's no meaningful content to save.
 */
function evidenceToMarkdown(stepKey: string, evidence: unknown): string | null {
  if (!evidence || typeof evidence !== 'object') return null

  const data = evidence as Record<string, unknown>

  // Skip if evidence only contains { completedAt } or is empty
  const keys = Object.keys(data)
  if (keys.length === 0) return null
  if (keys.length === 1 && keys[0] === 'completedAt') return null

  switch (stepKey) {
    case '1.1': {
      // ProjectIdea: projectName, problemStatement, targetUsers, vision, ideaText
      const sections: string[] = []
      if (data.projectName) sections.push(`# ${data.projectName}\n`)
      if (data.problemStatement) sections.push(`## Problem Statement\n\n${data.problemStatement}\n`)
      if (data.targetUsers) sections.push(`## Target Users\n\n${data.targetUsers}\n`)
      if (data.vision) sections.push(`## Vision\n\n${data.vision}\n`)
      if (data.ideaText) sections.push(`## Project Idea\n\n${data.ideaText}\n`)
      return sections.length > 0 ? sections.join('\n') : null
    }

    case '1.3': {
      // ProjectBrief: has a content string
      const content = data.content as string | undefined
      return content && content.trim().length > 0 ? content : null
    }

    default: {
      // Generic fallback: stringify as JSON in a code block
      const json = JSON.stringify(evidence, null, 2)
      return `\`\`\`json\n${json}\n\`\`\``
    }
  }
}

/**
 * Save step evidence as a project artifact so it survives mode switches.
 * Uses upsert logic: updates existing artifact if one with the same name exists.
 */
async function saveStepArtifact(
  projectId: string,
  stepKey: string,
  evidence: unknown,
  userId: string
): Promise<void> {
  const stepConfig = getStep(stepKey)
  if (!stepConfig) return

  const markdown = evidenceToMarkdown(stepKey, evidence)
  if (!markdown) return

  const artifactName = `Helix Step ${stepKey} — ${stepConfig.title}`
  const storagePath = `projects/${projectId}/artifacts/helix-step-${stepKey}.md`
  const supabase = createServiceClient()

  // Upload markdown file to storage (upsert: true to overwrite if exists)
  const fileBuffer = Buffer.from(markdown, 'utf-8')
  const { error: uploadError } = await supabase.storage
    .from('artifacts')
    .upload(storagePath, fileBuffer, {
      contentType: 'text/markdown',
      upsert: true,
    })

  if (uploadError) {
    console.error('Failed to upload helix step artifact:', uploadError)
    return
  }

  // Check if artifact with this name already exists for this project
  const { data: existing } = await supabase
    .from('artifacts')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', artifactName)
    .single()

  if (existing) {
    // Update existing artifact record
    await supabase
      .from('artifacts')
      .update({
        file_size: fileBuffer.byteLength,
        content_text: markdown,
        processing_status: 'complete',
        storage_path: storagePath,
      })
      .eq('id', existing.id)
  } else {
    // Insert new artifact record
    await supabase
      .from('artifacts')
      .insert({
        project_id: projectId,
        name: artifactName,
        file_type: 'md',
        file_size: fileBuffer.byteLength,
        storage_path: storagePath,
        content_text: markdown,
        processing_status: 'complete',
        uploaded_by: userId,
      })
  }
}

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

  // Save step evidence as a project artifact (non-blocking — failure won't break step completion)
  try {
    await saveStepArtifact(projectId, stepKey, evidence, user.id)
  } catch (err) {
    console.error('Failed to save step artifact:', err)
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
