import { createServiceClient } from '@/lib/supabase/server'
import { getStep } from '@/config/helix-process'

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
export async function saveStepArtifact(
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
    console.error('[step-artifact] Storage upload failed:', uploadError)
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
      console.error('[step-artifact] DB update failed:', updateError)
    }
  } else {
    // Insert new artifact record
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
      console.error('[step-artifact] DB insert failed:', insertError)
    }
  }
}
