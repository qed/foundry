/**
 * Helix Artifact helpers — querying and organizing Helix-generated artifacts.
 *
 * Helix artifacts are created by `saveStepArtifact()` when a step completes.
 * They are stored in the same `artifacts` table as Open Mode files,
 * identified by the naming convention: "Helix Step {key} — {title}".
 *
 * These helpers provide structured access to Helix artifacts so they can be
 * displayed in both Helix Mode and Open Mode.
 */

import { createServiceClient } from '@/lib/supabase/server'

// ─── Configuration ───────────────────────────────────────────────────────────

export interface HelixStageConfig {
  number: number
  name: string
  steps: { key: string; name: string }[]
}

export const HELIX_STAGES: HelixStageConfig[] = [
  {
    number: 1,
    name: 'Planning',
    steps: [
      { key: '1.1', name: 'Project Idea' },
      { key: '1.2', name: 'Brainstorm & Refine' },
      { key: '1.3', name: 'Project Brief' },
    ],
  },
  {
    number: 2,
    name: 'Documentation',
    steps: [
      { key: '2.1', name: 'Identify Documentation' },
      { key: '2.2', name: 'Capture Knowledge' },
      { key: '2.3', name: 'Gather Documentation' },
      { key: '2.4', name: 'Verify Documentation' },
    ],
  },
]

/**
 * The artifact name prefix used to identify Helix-generated artifacts.
 */
export const HELIX_ARTIFACT_PREFIX = 'Helix Step'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HelixArtifact {
  id: string
  project_id: string
  name: string
  file_type: string
  file_size: number
  storage_path: string
  content_text: string | null
  processing_status: string
  uploaded_by: string
  created_at: string
  updated_at: string
  step_key: string | null
  stage_number: number | null
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Extract the step key from a Helix artifact name.
 * Example: "Helix Step 2.1 — Identify Documentation" → "2.1"
 */
export function extractStepKeyFromName(name: string): string | null {
  const match = name.match(/^Helix Step (\d+\.\d+)/)
  return match ? match[1] : null
}

/**
 * Get the stage number from a step key.
 * Example: "2.3" → 2
 */
export function getStageNumberFromStepKey(stepKey: string): number | null {
  const parts = stepKey.split('.')
  const num = parseInt(parts[0], 10)
  return isNaN(num) ? null : num
}

/**
 * Check if an artifact is a Helix-generated artifact by its name.
 */
export function isHelixArtifact(name: string): boolean {
  return name.startsWith(HELIX_ARTIFACT_PREFIX)
}

/**
 * Enrich a raw artifact row with parsed Helix metadata.
 */
function toHelixArtifact(row: Record<string, unknown>): HelixArtifact {
  const name = row.name as string
  const stepKey = extractStepKeyFromName(name)
  const stageNumber = stepKey ? getStageNumberFromStepKey(stepKey) : null

  return {
    id: row.id as string,
    project_id: row.project_id as string,
    name,
    file_type: row.file_type as string,
    file_size: row.file_size as number,
    storage_path: row.storage_path as string,
    content_text: (row.content_text as string) ?? null,
    processing_status: row.processing_status as string,
    uploaded_by: row.uploaded_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    step_key: stepKey,
    stage_number: stageNumber,
  }
}

// ─── Query Helpers ───────────────────────────────────────────────────────────

/**
 * Get all Helix artifacts for a project, ordered by step key.
 */
export async function getHelixArtifacts(
  projectId: string
): Promise<HelixArtifact[]> {
  const client = createServiceClient()
  const { data, error } = await client
    .from('artifacts')
    .select('*')
    .eq('project_id', projectId)
    .like('name', `${HELIX_ARTIFACT_PREFIX}%`)
    .order('name', { ascending: true })

  if (error || !data) return []
  return data.map((row) => toHelixArtifact(row as Record<string, unknown>))
}

/**
 * Get all Helix artifacts for a specific stage.
 */
export async function getStageArtifacts(
  projectId: string,
  stageNumber: number
): Promise<HelixArtifact[]> {
  const all = await getHelixArtifacts(projectId)
  return all.filter((a) => a.stage_number === stageNumber)
}

/**
 * Get the artifact for a specific step, if it exists.
 */
export async function getStepArtifact(
  projectId: string,
  stepKey: string
): Promise<HelixArtifact | null> {
  const client = createServiceClient()
  const { data, error } = await client
    .from('artifacts')
    .select('*')
    .eq('project_id', projectId)
    .like('name', `Helix Step ${stepKey} —%`)
    .maybeSingle()

  if (error || !data) return null
  return toHelixArtifact(data as Record<string, unknown>)
}

/**
 * Get a summary of Helix artifact coverage for a project.
 * Returns which steps have artifacts and which don't.
 */
export async function getHelixArtifactCoverage(
  projectId: string
): Promise<{ stepKey: string; stepName: string; hasArtifact: boolean; artifactId: string | null }[]> {
  const artifacts = await getHelixArtifacts(projectId)
  const artifactsByStep = new Map<string, HelixArtifact>()
  for (const a of artifacts) {
    if (a.step_key) artifactsByStep.set(a.step_key, a)
  }

  const coverage: { stepKey: string; stepName: string; hasArtifact: boolean; artifactId: string | null }[] = []
  for (const stage of HELIX_STAGES) {
    for (const step of stage.steps) {
      const artifact = artifactsByStep.get(step.key)
      coverage.push({
        stepKey: step.key,
        stepName: step.name,
        hasArtifact: !!artifact,
        artifactId: artifact?.id ?? null,
      })
    }
  }
  return coverage
}
