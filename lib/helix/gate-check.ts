import { getProjectSteps, getProjectStageGates, getStepByKey, getStageGate } from '@/lib/db/helix'
import { getStep as getStepConfig, getStageSteps, HELIX_STAGES } from '@/config/helix-process'
import type { HelixStep, HelixStageGate, Json } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GateCheckResult {
  allowed: boolean
  reason: string | null
  blockers: string[]
  warnings: string[]
}

export interface EvidenceValidationResult {
  valid: boolean
  errors: string[]
}

// ---------------------------------------------------------------------------
// Evidence Validation
// ---------------------------------------------------------------------------

/**
 * Validate that evidence data satisfies the requirements for a step.
 */
export function validateEvidence(
  stepKey: string,
  evidenceData: Json | null
): EvidenceValidationResult {
  const config = getStepConfig(stepKey)
  if (!config) {
    return { valid: false, errors: [`Unknown step: ${stepKey}`] }
  }

  const errors: string[] = []

  for (const req of config.evidenceRequirements) {
    if (!req.required) continue

    if (!evidenceData || typeof evidenceData !== 'object' || Array.isArray(evidenceData)) {
      errors.push(`Missing required evidence: ${req.label}`)
      continue
    }

    const data = evidenceData as Record<string, Json | undefined>

    switch (req.type) {
      case 'text': {
        const text = data.text
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
          errors.push(`Missing required text evidence: ${req.label}`)
        }
        break
      }
      case 'file': {
        const fileUrl = data.fileUrl
        if (!fileUrl || typeof fileUrl !== 'string' || fileUrl.trim().length === 0) {
          errors.push(`Missing required file evidence: ${req.label}`)
        }
        break
      }
      case 'url': {
        const url = data.url
        if (!url || typeof url !== 'string' || url.trim().length === 0) {
          errors.push(`Missing required URL evidence: ${req.label}`)
        }
        break
      }
      case 'checklist': {
        const items = data.checklist
        if (!items || !Array.isArray(items) || items.length === 0) {
          errors.push(`Missing required checklist: ${req.label}`)
        } else {
          const allChecked = items.every(
            (item) => typeof item === 'object' && item !== null && !Array.isArray(item) && (item as Record<string, Json | undefined>).checked === true
          )
          if (!allChecked) {
            errors.push(`Not all checklist items completed: ${req.label}`)
          }
        }
        break
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Step Completion Check
// ---------------------------------------------------------------------------

/**
 * Check whether a step can be marked as complete.
 * Validates evidence and ensures the step is active.
 */
export async function canCompleteStep(
  projectId: string,
  stepKey: string
): Promise<GateCheckResult> {
  const blockers: string[] = []
  const warnings: string[] = []

  // Get the step from DB
  const step = await getStepByKey(projectId, stepKey)
  if (!step) {
    return { allowed: false, reason: 'Step not found', blockers: ['Step does not exist'], warnings: [] }
  }

  // Must be active to complete
  if (step.status !== 'active') {
    blockers.push(`Step ${stepKey} is ${step.status}, not active`)
  }

  // Validate evidence
  const evidenceResult = validateEvidence(stepKey, step.evidence_data)
  if (!evidenceResult.valid) {
    blockers.push(...evidenceResult.errors)
  }

  // Check that all previous steps in the same stage are complete
  const config = getStepConfig(stepKey)
  if (config) {
    const stageSteps = getStageSteps(config.stageNumber)
    const previousSteps = stageSteps.filter((s) => s.stepNumber < config.stepNumber)

    if (previousSteps.length > 0) {
      const allProjectSteps = await getProjectSteps(projectId)
      for (const prevStepConfig of previousSteps) {
        const prevStep = allProjectSteps.find((s) => s.step_key === prevStepConfig.key)
        if (!prevStep || prevStep.status !== 'complete') {
          blockers.push(`Previous step ${prevStepConfig.key} (${prevStepConfig.title}) must be completed first`)
        }
      }
    }
  }

  return {
    allowed: blockers.length === 0,
    reason: blockers.length > 0 ? 'Step has blocking issues' : null,
    blockers,
    warnings,
  }
}

// ---------------------------------------------------------------------------
// Step Activation Check
// ---------------------------------------------------------------------------

/**
 * Check whether a step can be activated (unlocked).
 * The step's stage gate must be active/passed, and preceding steps must be complete.
 */
export async function canActivateStep(
  projectId: string,
  stepKey: string
): Promise<GateCheckResult> {
  const blockers: string[] = []
  const warnings: string[] = []

  const config = getStepConfig(stepKey)
  if (!config) {
    return { allowed: false, reason: 'Unknown step', blockers: ['Step configuration not found'], warnings: [] }
  }

  // Check the step's current status
  const step = await getStepByKey(projectId, stepKey)
  if (step && step.status !== 'locked') {
    return { allowed: false, reason: `Step is already ${step.status}`, blockers: [`Step is already ${step.status}`], warnings: [] }
  }

  // The step's stage gate must be active or passed
  const gate = await getStageGate(projectId, config.stageNumber)
  if (!gate || gate.status === 'locked') {
    blockers.push(`Stage ${config.stageNumber} gate is locked`)
  }

  // All previous steps in the same stage must be complete
  const stageSteps = getStageSteps(config.stageNumber)
  const previousSteps = stageSteps.filter((s) => s.stepNumber < config.stepNumber)

  if (previousSteps.length > 0) {
    const allProjectSteps = await getProjectSteps(projectId)
    for (const prevStepConfig of previousSteps) {
      const prevStep = allProjectSteps.find((s) => s.step_key === prevStepConfig.key)
      if (!prevStep || prevStep.status !== 'complete') {
        blockers.push(`Step ${prevStepConfig.key} (${prevStepConfig.title}) must be completed first`)
      }
    }
  }

  return {
    allowed: blockers.length === 0,
    reason: blockers.length > 0 ? 'Step cannot be activated yet' : null,
    blockers,
    warnings,
  }
}

// ---------------------------------------------------------------------------
// Stage Gate Check
// ---------------------------------------------------------------------------

/**
 * Check whether a stage gate can be passed.
 * All steps in the stage must be complete.
 */
export async function canPassStageGate(
  projectId: string,
  stageNumber: number
): Promise<GateCheckResult> {
  const blockers: string[] = []
  const warnings: string[] = []

  const stageConfig = HELIX_STAGES.find((s) => s.number === stageNumber)
  if (!stageConfig) {
    return { allowed: false, reason: 'Invalid stage', blockers: ['Stage not found'], warnings: [] }
  }

  // Gate must be active
  const gate = await getStageGate(projectId, stageNumber)
  if (!gate) {
    return { allowed: false, reason: 'Gate not found', blockers: ['Stage gate record not found'], warnings: [] }
  }
  if (gate.status === 'passed') {
    return { allowed: false, reason: 'Gate already passed', blockers: ['Stage gate already passed'], warnings: [] }
  }
  if (gate.status === 'locked') {
    blockers.push('Stage gate is locked')
  }

  // All previous stage gates must be passed
  if (stageNumber > 1) {
    const allGates = await getProjectStageGates(projectId)
    for (let i = 1; i < stageNumber; i++) {
      const prevGate = allGates.find((g) => g.stage_number === i)
      if (!prevGate || prevGate.status !== 'passed') {
        blockers.push(`Stage ${i} gate must be passed first`)
      }
    }
  }

  // All steps in the stage must be complete
  const allSteps = await getProjectSteps(projectId)
  const stageSteps = allSteps.filter((s) => s.stage_number === stageNumber)

  for (const step of stageSteps) {
    if (step.status !== 'complete') {
      const stepConfig = getStepConfig(step.step_key)
      blockers.push(
        `Step ${step.step_key} (${stepConfig?.title ?? 'Unknown'}) is not complete`
      )
    }
  }

  return {
    allowed: blockers.length === 0,
    reason: blockers.length > 0 ? 'Stage has incomplete requirements' : null,
    blockers,
    warnings,
  }
}
