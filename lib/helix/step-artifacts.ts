import { createServiceClient } from '@/lib/supabase/server'
import { getStep } from '@/config/helix-process'

export interface StepArtifactResult {
  saved: boolean
  name?: string
  error?: string
}

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
      if (data.ideaText) {
        // Strip HTML tags from TipTap editor output for clean markdown
        const plain = (data.ideaText as string).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        if (plain) sections.push(`## Project Idea\n\n${plain}\n`)
      }
      return sections.length > 0 ? sections.join('\n') : null
    }

    case '1.2': {
      // Brainstorming prompt text generated for the user
      const prompt = data.prompt as string | undefined
      return prompt && prompt.trim().length > 0 ? prompt : null
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
 * Returns a result object indicating success/failure for diagnostics.
 */
/** Timeout wrapper — rejects after ms. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Artifact save timed out after ${ms}ms`)), ms)
    ),
  ])
}

export async function saveStepArtifact(
  projectId: string,
  stepKey: string,
  evidence: unknown,
  userId: string
): Promise<StepArtifactResult> {
  return withTimeout(saveStepArtifactInner(projectId, stepKey, evidence, userId), 10_000)
}

async function saveStepArtifactInner(
  projectId: string,
  stepKey: string,
  evidence: unknown,
  userId: string
): Promise<StepArtifactResult> {
  const stepConfig = getStep(stepKey)
  if (!stepConfig) {
    return { saved: false, error: `No step config found for key "${stepKey}"` }
  }

  const markdown = evidenceToMarkdown(stepKey, evidence)
  if (!markdown) {
    return { saved: false, error: `No markdown produced for step "${stepKey}" (evidence keys: ${evidence && typeof evidence === 'object' ? Object.keys(evidence as Record<string, unknown>).join(', ') : 'none'})` }
  }

  const artifactName = `Helix Step ${stepKey} — ${stepConfig.title}`
  const storagePath = `projects/${projectId}/artifacts/helix-step-${stepKey}.md`
  const supabase = createServiceClient()

  // Upload markdown file to storage (upsert: true to overwrite if exists)
  const fileBuffer = Buffer.from(markdown, 'utf-8')
  let { error: uploadError } = await supabase.storage
    .from('artifacts')
    .upload(storagePath, fileBuffer, {
      contentType: 'text/markdown',
      upsert: true,
    })

  // Auto-create the storage bucket if it doesn't exist, then retry
  if (uploadError?.message === 'Bucket not found') {
    await supabase.storage.createBucket('artifacts', { public: false })
    const retry = await supabase.storage
      .from('artifacts')
      .upload(storagePath, fileBuffer, {
        contentType: 'text/markdown',
        upsert: true,
      })
    uploadError = retry.error
  }

  if (uploadError) {
    return { saved: false, name: artifactName, error: `Storage upload failed: ${uploadError.message}` }
  }

  // Check if artifact with this name already exists for this project
  const { data: existing } = await supabase
    .from('artifacts')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', artifactName)
    .single()

  if (existing) {
    const { error: updateError } = await supabase
      .from('artifacts')
      .update({
        file_size: fileBuffer.byteLength,
        content_text: markdown,
        processing_status: 'complete',
        storage_path: storagePath,
      })
      .eq('id', existing.id)

    if (updateError) {
      return { saved: false, name: artifactName, error: `DB update failed: ${updateError.message}` }
    }
  } else {
    const { error: insertError } = await supabase
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

    if (insertError) {
      return { saved: false, name: artifactName, error: `DB insert failed: ${insertError.message}` }
    }
  }

  return { saved: true, name: artifactName }
}
