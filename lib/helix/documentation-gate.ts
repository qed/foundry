/**
 * Documentation Stage gate validation — quality checks beyond simple step completion.
 *
 * The generic gate-check.ts verifies all steps are complete.
 * This module adds content-quality validation specific to the Documentation Stage.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QualityCheck {
  id: string
  name: string
  status: 'pass' | 'fail'
  detail: string
  stepKey: string
}

export interface DocumentationGateResult {
  stageNumber: 2
  stageName: 'Documentation'
  stepChecks: StepCheck[]
  qualityChecks: QualityCheck[]
  totalChecks: number
  passedChecks: number
  gateStatus: 'passed' | 'failed'
  blockingIssues: string[]
}

export interface StepCheck {
  stepKey: string
  stepName: string
  status: 'complete' | 'incomplete'
  evidencePresent: boolean
}

// ─── Step Evidence Types ─────────────────────────────────────────────────────

interface InventoryEvidence {
  inventory_type?: string
  categories?: Array<{
    category_id: string
    exists: boolean
    file_count_estimate?: number
  }>
}

interface KnowledgeEvidence {
  evidence_type?: string
  sections?: Record<string, { content: string }>
  sections_completed?: number
}

interface FilesEvidence {
  evidence_type?: string
  files?: Array<{
    file_id: string
    file_name: string
    file_size_bytes: number
    category: string
  }>
  total_files?: number
}

interface VerificationEvidence {
  evidence_type?: string
  verification?: {
    all_gaps_acknowledged: boolean
    verification_status: string
    categories_complete: number
    categories_partial: number
    categories_missing: number
  }
  category_gaps?: Array<{
    acknowledged: boolean
  }>
}

// ─── Step Name Config ────────────────────────────────────────────────────────

const STEP_NAMES: Record<string, string> = {
  '2.1': 'Identify Documentation',
  '2.2': 'Capture Knowledge',
  '2.3': 'Gather Documentation',
  '2.4': 'Verify Documentation',
}

// ─── Validation Functions (Pure) ─────────────────────────────────────────────

/**
 * Validate Step 2.1: At least 1 category must have exists=true.
 */
export function validateStep21Evidence(
  evidenceData: unknown
): QualityCheck {
  const data = evidenceData as InventoryEvidence | null

  if (!data || data.inventory_type !== 'documentation_inventory') {
    return {
      id: 'inventory_categories',
      name: 'At least 1 documentation category identified',
      status: 'fail',
      detail: 'No inventory data found',
      stepKey: '2.1',
    }
  }

  const categories = data.categories ?? []
  const checked = categories.filter((c) => c.exists).length

  if (checked === 0) {
    return {
      id: 'inventory_categories',
      name: 'At least 1 documentation category identified',
      status: 'fail',
      detail: `${categories.length} categories present but none marked as existing`,
      stepKey: '2.1',
    }
  }

  return {
    id: 'inventory_categories',
    name: 'At least 1 documentation category identified',
    status: 'pass',
    detail: `${checked} of ${categories.length} categories identified`,
    stepKey: '2.1',
  }
}

/**
 * Validate Step 2.2: At least 3 sections with 50+ characters.
 */
export function validateStep22Evidence(
  evidenceData: unknown
): QualityCheck {
  const data = evidenceData as KnowledgeEvidence | null

  if (!data || data.evidence_type !== 'knowledge_capture') {
    return {
      id: 'knowledge_sections',
      name: 'Knowledge capture: 3+ sections with content',
      status: 'fail',
      detail: 'No knowledge capture data found',
      stepKey: '2.2',
    }
  }

  const sections = data.sections ?? {}
  const completed = Object.values(sections).filter(
    (s) => s.content && s.content.replace(/<[^>]*>/g, '').trim().length >= 50
  ).length

  if (completed < 3) {
    return {
      id: 'knowledge_sections',
      name: 'Knowledge capture: 3+ sections with content',
      status: 'fail',
      detail: `Only ${completed} of ${Object.keys(sections).length} sections completed (need 3)`,
      stepKey: '2.2',
    }
  }

  return {
    id: 'knowledge_sections',
    name: 'Knowledge capture: 3+ sections with content',
    status: 'pass',
    detail: `${completed} sections completed`,
    stepKey: '2.2',
  }
}

/**
 * Validate Step 2.3: At least 1 file uploaded.
 */
export function validateStep23Evidence(
  evidenceData: unknown
): QualityCheck {
  const data = evidenceData as FilesEvidence | null

  if (!data || data.evidence_type !== 'documentation_files') {
    return {
      id: 'documentation_files',
      name: 'At least 1 documentation file uploaded',
      status: 'fail',
      detail: 'No file upload data found',
      stepKey: '2.3',
    }
  }

  const fileCount = data.total_files ?? data.files?.length ?? 0

  if (fileCount === 0) {
    return {
      id: 'documentation_files',
      name: 'At least 1 documentation file uploaded',
      status: 'fail',
      detail: 'No documentation files uploaded',
      stepKey: '2.3',
    }
  }

  return {
    id: 'documentation_files',
    name: 'At least 1 documentation file uploaded',
    status: 'pass',
    detail: `${fileCount} file${fileCount !== 1 ? 's' : ''} uploaded`,
    stepKey: '2.3',
  }
}

/**
 * Validate Step 2.4: All gaps acknowledged and verification passed.
 */
export function validateStep24Evidence(
  evidenceData: unknown
): QualityCheck {
  const data = evidenceData as VerificationEvidence | null

  if (!data || data.evidence_type !== 'documentation_verification') {
    return {
      id: 'gaps_acknowledged',
      name: 'All documentation gaps acknowledged',
      status: 'fail',
      detail: 'No verification data found',
      stepKey: '2.4',
    }
  }

  const verification = data.verification
  if (!verification) {
    return {
      id: 'gaps_acknowledged',
      name: 'All documentation gaps acknowledged',
      status: 'fail',
      detail: 'Verification data is missing',
      stepKey: '2.4',
    }
  }

  if (!verification.all_gaps_acknowledged) {
    const gaps = data.category_gaps ?? []
    const unacked = gaps.filter((g) => !g.acknowledged).length
    return {
      id: 'gaps_acknowledged',
      name: 'All documentation gaps acknowledged',
      status: 'fail',
      detail: `${unacked} gap${unacked !== 1 ? 's' : ''} not acknowledged`,
      stepKey: '2.4',
    }
  }

  return {
    id: 'gaps_acknowledged',
    name: 'All documentation gaps acknowledged',
    status: 'pass',
    detail: 'All gaps acknowledged and verified',
    stepKey: '2.4',
  }
}

// ─── Full Gate Check ─────────────────────────────────────────────────────────

interface StepData {
  stepKey: string
  status: string
  evidenceData: unknown
}

/**
 * Run the full Documentation Stage gate check.
 * Takes step data as input (pre-fetched from DB) so this remains a pure function.
 */
export function checkDocumentationGate(
  steps: StepData[]
): DocumentationGateResult {
  const stepMap = new Map(steps.map((s) => [s.stepKey, s]))

  // Step completion checks
  const stepChecks: StepCheck[] = ['2.1', '2.2', '2.3', '2.4'].map((key) => {
    const step = stepMap.get(key)
    return {
      stepKey: key,
      stepName: STEP_NAMES[key] ?? key,
      status: step?.status === 'complete' ? 'complete' : 'incomplete',
      evidencePresent: !!step?.evidenceData,
    }
  })

  // Quality checks
  const qualityChecks: QualityCheck[] = [
    validateStep21Evidence(stepMap.get('2.1')?.evidenceData),
    validateStep22Evidence(stepMap.get('2.2')?.evidenceData),
    validateStep23Evidence(stepMap.get('2.3')?.evidenceData),
    validateStep24Evidence(stepMap.get('2.4')?.evidenceData),
  ]

  // Blocking issues
  const blockingIssues: string[] = []
  for (const sc of stepChecks) {
    if (sc.status === 'incomplete') {
      blockingIssues.push(`Step ${sc.stepKey} (${sc.stepName}) is not complete`)
    }
  }
  for (const qc of qualityChecks) {
    if (qc.status === 'fail') {
      blockingIssues.push(`${qc.name}: ${qc.detail}`)
    }
  }

  const totalChecks = stepChecks.length + qualityChecks.length
  const passedSteps = stepChecks.filter((s) => s.status === 'complete').length
  const passedQuality = qualityChecks.filter((q) => q.status === 'pass').length
  const passedChecks = passedSteps + passedQuality

  return {
    stageNumber: 2,
    stageName: 'Documentation',
    stepChecks,
    qualityChecks,
    totalChecks,
    passedChecks,
    gateStatus: passedChecks === totalChecks ? 'passed' : 'failed',
    blockingIssues,
  }
}
