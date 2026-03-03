/**
 * Documentation verification logic for Step 2.4.
 * Compares inventory (Step 2.1) with uploaded files (Step 2.3)
 * to identify gaps and require acknowledgment before completion.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type GapStatus = 'complete' | 'partial' | 'missing' | 'not_applicable'

export const GAP_REASONS = [
  { value: 'will_be_resolved_during_planning', label: 'Will be resolved during planning' },
  { value: 'not_critical_for_build', label: 'Not critical for build' },
  { value: 'will_be_provided_later', label: 'Will be provided later' },
  { value: 'was_intentionally_excluded', label: 'Was intentionally excluded' },
  { value: 'other', label: 'Other (please specify)' },
] as const

export type GapReasonValue = (typeof GAP_REASONS)[number]['value']

export const MAX_GAP_NOTES_LENGTH = 100

export interface CategoryGap {
  category_id: string
  category_name: string
  inventory_status: 'exists' | 'not_exists'
  inventory_estimate: number
  files_uploaded: number
  gap_status: GapStatus
  acknowledged: boolean
  gap_reason: GapReasonValue | null
  gap_notes: string
}

export interface VerificationEvidence {
  evidence_type: 'documentation_verification'
  created_at: string
  updated_at: string
  verification: {
    total_categories: number
    categories_complete: number
    categories_partial: number
    categories_missing: number
    categories_not_applicable: number
    all_gaps_acknowledged: boolean
    verification_status: 'passed' | 'gaps_remaining'
  }
  category_gaps: CategoryGap[]
  completion_summary: string
}

// ─── Inventory / Files evidence shapes (from steps 2.1, 2.3) ─────────────

interface InventoryCategory {
  category_id: string
  category_name: string
  exists: boolean
  file_count_estimate: number
  location_notes: string
  is_custom: boolean
}

interface UploadedFile {
  file_id: string
  file_name: string
  category: string
}

// ─── Gap Calculation ─────────────────────────────────────────────────────────

/**
 * Calculate gap status for each inventory category based on uploaded files.
 */
export function calculateGaps(
  inventoryCategories: InventoryCategory[],
  uploadedFiles: UploadedFile[],
  existingAcknowledgments?: Record<string, { acknowledged: boolean; gap_reason: GapReasonValue | null; gap_notes: string }>
): CategoryGap[] {
  return inventoryCategories.map((category) => {
    const filesForCategory = uploadedFiles.filter(
      (f) => f.category === category.category_id
    )
    const fileCount = filesForCategory.length
    const estimated = category.file_count_estimate || 0

    let gapStatus: GapStatus = 'not_applicable'
    if (category.exists) {
      if (fileCount > 0 && (estimated === 0 || fileCount >= estimated)) {
        gapStatus = 'complete'
      } else if (fileCount > 0) {
        gapStatus = 'partial'
      } else {
        gapStatus = 'missing'
      }
    }

    const existing = existingAcknowledgments?.[category.category_id]

    return {
      category_id: category.category_id,
      category_name: category.category_name,
      inventory_status: category.exists ? 'exists' : 'not_exists',
      inventory_estimate: estimated,
      files_uploaded: fileCount,
      gap_status: gapStatus,
      acknowledged: existing?.acknowledged ?? false,
      gap_reason: existing?.gap_reason ?? null,
      gap_notes: existing?.gap_notes ?? '',
    }
  })
}

/**
 * Count gaps by status.
 */
export function countGapsByStatus(gaps: CategoryGap[]) {
  return {
    complete: gaps.filter((g) => g.gap_status === 'complete').length,
    partial: gaps.filter((g) => g.gap_status === 'partial').length,
    missing: gaps.filter((g) => g.gap_status === 'missing').length,
    not_applicable: gaps.filter((g) => g.gap_status === 'not_applicable').length,
  }
}

/**
 * Check if all critical gaps (partial + missing) are acknowledged.
 */
export function allGapsAcknowledged(gaps: CategoryGap[]): boolean {
  const critical = gaps.filter(
    (g) => g.gap_status === 'partial' || g.gap_status === 'missing'
  )
  return critical.every((g) => g.acknowledged)
}

/**
 * Count unacknowledged critical gaps.
 */
export function countUnacknowledgedGaps(gaps: CategoryGap[]): number {
  return gaps.filter(
    (g) =>
      (g.gap_status === 'partial' || g.gap_status === 'missing') &&
      !g.acknowledged
  ).length
}

/**
 * Build the verification evidence object for saving.
 */
export function buildVerificationEvidence(
  gaps: CategoryGap[]
): VerificationEvidence {
  const counts = countGapsByStatus(gaps)
  const allAcked = allGapsAcknowledged(gaps)
  const now = new Date().toISOString()

  const parts: string[] = []
  if (counts.complete > 0) parts.push(`${counts.complete} complete`)
  if (counts.partial > 0)
    parts.push(`${counts.partial} partial with acknowledged gaps`)
  if (counts.missing > 0)
    parts.push(`${counts.missing} missing with acknowledged gaps`)
  if (counts.not_applicable > 0)
    parts.push(`${counts.not_applicable} not applicable`)

  return {
    evidence_type: 'documentation_verification',
    created_at: now,
    updated_at: now,
    verification: {
      total_categories: gaps.length,
      categories_complete: counts.complete,
      categories_partial: counts.partial,
      categories_missing: counts.missing,
      categories_not_applicable: counts.not_applicable,
      all_gaps_acknowledged: allAcked,
      verification_status: allAcked ? 'passed' : 'gaps_remaining',
    },
    category_gaps: gaps,
    completion_summary: parts.join(', '),
  }
}

/**
 * Validate verification gate — all critical gaps must be acknowledged.
 */
export function validateVerificationGate(
  gaps: CategoryGap[]
): { valid: boolean; error: string | null } {
  const unacked = countUnacknowledgedGaps(gaps)
  if (unacked > 0) {
    return {
      valid: false,
      error: `Please acknowledge all missing or incomplete documentation categories before completing this step (${unacked} remaining)`,
    }
  }
  return { valid: true, error: null }
}

/**
 * Extract inventory categories from Step 2.1 evidence data.
 */
export function extractInventoryCategories(
  evidenceData: unknown
): InventoryCategory[] {
  if (!evidenceData || typeof evidenceData !== 'object') return []
  const data = evidenceData as Record<string, unknown>
  if (data.inventory_type !== 'documentation_inventory') return []
  const categories = data.categories as InventoryCategory[] | undefined
  return categories ?? []
}

/**
 * Extract uploaded files from Step 2.3 evidence data.
 */
export function extractUploadedFiles(evidenceData: unknown): UploadedFile[] {
  if (!evidenceData || typeof evidenceData !== 'object') return []
  const data = evidenceData as Record<string, unknown>
  if (data.evidence_type !== 'documentation_files') return []
  const files = data.files as UploadedFile[] | undefined
  return files ?? []
}
