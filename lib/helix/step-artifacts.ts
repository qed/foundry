import { createServiceClient } from '@/lib/supabase/server'
import { getStep } from '@/config/helix-process'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface StepArtifactResult {
  saved: boolean
  name?: string
  error?: string
  diagnostics?: string[]
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

/** Timeout wrapper — rejects after ms. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Artifact save timed out after ${ms}ms`)), ms)
    ),
  ])
}

/**
 * Save step evidence as a project artifact.
 * Accepts an optional supabase client — when called from a server action, pass the
 * user's authenticated client so we don't depend on the service role key.
 * Falls back to the service client for backward compat (auto-save route).
 */
export async function saveStepArtifact(
  projectId: string,
  stepKey: string,
  evidence: unknown,
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<StepArtifactResult> {
  return withTimeout(
    saveStepArtifactInner(projectId, stepKey, evidence, userId, supabaseClient),
    10_000
  )
}

async function saveStepArtifactInner(
  projectId: string,
  stepKey: string,
  evidence: unknown,
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<StepArtifactResult> {
  const diag: string[] = []

  const stepConfig = getStep(stepKey)
  if (!stepConfig) {
    diag.push(`No step config for "${stepKey}"`)
    return { saved: false, error: `No step config found for key "${stepKey}"`, diagnostics: diag }
  }
  diag.push(`Step config found: "${stepConfig.title}"`)

  const markdown = evidenceToMarkdown(stepKey, evidence)
  if (!markdown) {
    const evidenceKeys = evidence && typeof evidence === 'object'
      ? Object.keys(evidence as Record<string, unknown>).join(', ')
      : 'none'
    diag.push(`evidenceToMarkdown returned null — evidence keys: ${evidenceKeys}`)
    return {
      saved: false,
      error: `No markdown produced for step "${stepKey}" (evidence keys: ${evidenceKeys})`,
      diagnostics: diag,
    }
  }
  diag.push(`Markdown generated: ${markdown.length} chars, starts with: "${markdown.slice(0, 80)}..."`)

  const artifactName = `Helix Step ${stepKey} — ${stepConfig.title}`
  const storagePath = `projects/${projectId}/artifacts/helix-step-${stepKey}.md`
  diag.push(`Artifact name: "${artifactName}"`)
  diag.push(`Storage path: "${storagePath}"`)

  // Use service client for storage (bypasses RLS), user client for DB if available
  const serviceClient = createServiceClient()
  const dbClient = supabaseClient ?? serviceClient
  const clientType = supabaseClient ? 'user-auth' : 'service-role'
  diag.push(`DB client: ${clientType}, Storage client: service-role`)

  // Upload markdown file to storage (best-effort — DB content_text is the source of truth)
  const fileBuffer = Buffer.from(markdown, 'utf-8')
  diag.push(`File buffer: ${fileBuffer.byteLength} bytes`)

  let storageError: string | null = null
  try {
    let { error: uploadError } = await serviceClient.storage
      .from('artifacts')
      .upload(storagePath, fileBuffer, {
        contentType: 'text/markdown',
        upsert: true,
      })

    if (uploadError?.message === 'Bucket not found') {
      diag.push('Storage bucket not found — creating...')
      await serviceClient.storage.createBucket('artifacts', { public: false })
      const retry = await serviceClient.storage
        .from('artifacts')
        .upload(storagePath, fileBuffer, {
          contentType: 'text/markdown',
          upsert: true,
        })
      uploadError = retry.error
    }

    if (uploadError) {
      storageError = uploadError.message
      diag.push(`Storage upload FAILED: ${uploadError.message}`)
    } else {
      diag.push('Storage upload OK')
    }
  } catch (err) {
    storageError = String(err)
    diag.push(`Storage upload THREW: ${err}`)
  }

  // Save artifact DB record regardless of storage upload result
  diag.push('Querying for existing artifact...')
  const { data: existing, error: selectError } = await dbClient
    .from('artifacts')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', artifactName)
    .maybeSingle()

  if (selectError) {
    diag.push(`DB select FAILED: ${selectError.message} (code: ${selectError.code})`)
    return { saved: false, name: artifactName, error: `DB select failed: ${selectError.message}`, diagnostics: diag }
  }

  if (existing) {
    diag.push(`Found existing artifact id=${existing.id} — updating...`)
    const { error: updateError, count } = await dbClient
      .from('artifacts')
      .update({
        file_size: fileBuffer.byteLength,
        content_text: markdown,
        processing_status: 'complete',
        storage_path: storagePath,
        folder_id: null,
      })
      .eq('id', existing.id)

    if (updateError) {
      diag.push(`DB update FAILED: ${updateError.message} (code: ${updateError.code})`)
      return { saved: false, name: artifactName, error: `DB update failed: ${updateError.message}`, diagnostics: diag }
    }
    diag.push(`DB update OK (count: ${count ?? 'unknown'})`)
  } else {
    diag.push('No existing artifact — inserting new...')
    const { error: insertError, count } = await dbClient
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
      diag.push(`DB insert FAILED: ${insertError.message} (code: ${insertError.code})`)
      return { saved: false, name: artifactName, error: `DB insert failed: ${insertError.message}`, diagnostics: diag }
    }
    diag.push(`DB insert OK (count: ${count ?? 'unknown'})`)
  }

  // Verify the artifact was actually saved by reading it back
  diag.push('Verifying artifact in DB...')
  const { data: verify, error: verifyError } = await dbClient
    .from('artifacts')
    .select('id, name, file_size, processing_status, content_text, folder_id')
    .eq('project_id', projectId)
    .eq('name', artifactName)
    .maybeSingle()

  if (verifyError) {
    diag.push(`Verify query FAILED: ${verifyError.message}`)
  } else if (!verify) {
    diag.push('VERIFY FAILED: Artifact not found after insert/update!')
  } else {
    diag.push(`Verified: id=${verify.id}, size=${verify.file_size}, status=${verify.processing_status}, content_length=${verify.content_text?.length ?? 0}, folder_id=${verify.folder_id ?? 'null'}`)
  }

  if (storageError) {
    return { saved: true, name: artifactName, error: `Saved to DB but storage upload failed: ${storageError}`, diagnostics: diag }
  }

  return { saved: true, name: artifactName, diagnostics: diag }
}
