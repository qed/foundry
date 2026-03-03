import { describe, it, expect } from 'vitest'
import {
  calculateGaps,
  countGapsByStatus,
  allGapsAcknowledged,
  countUnacknowledgedGaps,
  buildVerificationEvidence,
  validateVerificationGate,
  extractInventoryCategories,
  extractUploadedFiles,
  GAP_REASONS,
  MAX_GAP_NOTES_LENGTH,
} from '@/lib/helix/documentation-verification'
import type { CategoryGap } from '@/lib/helix/documentation-verification'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const inventoryCategories = [
  { category_id: 'specs', category_name: 'Specifications', exists: true, file_count_estimate: 3, location_notes: '', is_custom: false },
  { category_id: 'mockups', category_name: 'Mockups', exists: true, file_count_estimate: 5, location_notes: '', is_custom: false },
  { category_id: 'api_docs', category_name: 'API Docs', exists: true, file_count_estimate: 2, location_notes: '', is_custom: false },
  { category_id: 'unused', category_name: 'Unused', exists: false, file_count_estimate: 0, location_notes: '', is_custom: false },
]

const uploadedFiles = [
  { file_id: '1', file_name: 'spec1.pdf', category: 'specs' },
  { file_id: '2', file_name: 'spec2.pdf', category: 'specs' },
  { file_id: '3', file_name: 'spec3.pdf', category: 'specs' },
  { file_id: '4', file_name: 'mockup1.png', category: 'mockups' },
  { file_id: '5', file_name: 'mockup2.png', category: 'mockups' },
  // api_docs has 0 files uploaded = missing
  // mockups has 2 of 5 = partial
]

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('documentation-verification', () => {
  describe('GAP_REASONS', () => {
    it('has 5 reason options', () => {
      expect(GAP_REASONS).toHaveLength(5)
    })

    it('each has value and label', () => {
      for (const reason of GAP_REASONS) {
        expect(reason.value).toBeTruthy()
        expect(reason.label).toBeTruthy()
      }
    })
  })

  describe('MAX_GAP_NOTES_LENGTH', () => {
    it('is 100', () => {
      expect(MAX_GAP_NOTES_LENGTH).toBe(100)
    })
  })

  describe('calculateGaps', () => {
    it('marks categories with enough files as complete', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles)
      const specs = gaps.find((g) => g.category_id === 'specs')
      expect(specs?.gap_status).toBe('complete')
      expect(specs?.files_uploaded).toBe(3)
    })

    it('marks categories with fewer files than estimate as partial', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles)
      const mockups = gaps.find((g) => g.category_id === 'mockups')
      expect(mockups?.gap_status).toBe('partial')
      expect(mockups?.files_uploaded).toBe(2)
    })

    it('marks categories with no files as missing', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles)
      const api = gaps.find((g) => g.category_id === 'api_docs')
      expect(api?.gap_status).toBe('missing')
      expect(api?.files_uploaded).toBe(0)
    })

    it('marks categories not in inventory as not_applicable', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles)
      const unused = gaps.find((g) => g.category_id === 'unused')
      expect(unused?.gap_status).toBe('not_applicable')
    })

    it('preserves existing acknowledgments', () => {
      const acks = {
        api_docs: {
          acknowledged: true,
          gap_reason: 'will_be_provided_later' as const,
          gap_notes: 'Coming next week',
        },
      }
      const gaps = calculateGaps(inventoryCategories, uploadedFiles, acks)
      const api = gaps.find((g) => g.category_id === 'api_docs')
      expect(api?.acknowledged).toBe(true)
      expect(api?.gap_reason).toBe('will_be_provided_later')
      expect(api?.gap_notes).toBe('Coming next week')
    })

    it('defaults acknowledgments to false', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles)
      for (const gap of gaps) {
        expect(gap.acknowledged).toBe(false)
        expect(gap.gap_reason).toBeNull()
        expect(gap.gap_notes).toBe('')
      }
    })

    it('handles category with estimate=0 and some files as complete', () => {
      const cats = [
        { category_id: 'test', category_name: 'Test', exists: true, file_count_estimate: 0, location_notes: '', is_custom: false },
      ]
      const files = [
        { file_id: '1', file_name: 'test.pdf', category: 'test' },
      ]
      const gaps = calculateGaps(cats, files)
      expect(gaps[0].gap_status).toBe('complete')
    })
  })

  describe('countGapsByStatus', () => {
    it('counts gaps correctly', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles)
      const counts = countGapsByStatus(gaps)
      expect(counts.complete).toBe(1) // specs
      expect(counts.partial).toBe(1) // mockups
      expect(counts.missing).toBe(1) // api_docs
      expect(counts.not_applicable).toBe(1) // unused
    })
  })

  describe('allGapsAcknowledged', () => {
    it('returns false when critical gaps are unacknowledged', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles)
      expect(allGapsAcknowledged(gaps)).toBe(false)
    })

    it('returns true when all critical gaps are acknowledged', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles)
      // Acknowledge the two critical gaps (partial + missing)
      const acked = gaps.map((g) =>
        g.gap_status === 'partial' || g.gap_status === 'missing'
          ? { ...g, acknowledged: true, gap_reason: 'not_critical_for_build' as const }
          : g
      )
      expect(allGapsAcknowledged(acked)).toBe(true)
    })

    it('returns true when there are no critical gaps', () => {
      const gaps: CategoryGap[] = [
        {
          category_id: 'a',
          category_name: 'A',
          inventory_status: 'exists',
          inventory_estimate: 1,
          files_uploaded: 1,
          gap_status: 'complete',
          acknowledged: false,
          gap_reason: null,
          gap_notes: '',
        },
      ]
      expect(allGapsAcknowledged(gaps)).toBe(true)
    })
  })

  describe('countUnacknowledgedGaps', () => {
    it('counts unacknowledged critical gaps', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles)
      expect(countUnacknowledgedGaps(gaps)).toBe(2) // partial + missing
    })

    it('returns 0 when all are acknowledged', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles).map((g) => ({
        ...g,
        acknowledged: true,
      }))
      expect(countUnacknowledgedGaps(gaps)).toBe(0)
    })
  })

  describe('buildVerificationEvidence', () => {
    it('builds valid evidence object', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles)
      const evidence = buildVerificationEvidence(gaps)

      expect(evidence.evidence_type).toBe('documentation_verification')
      expect(evidence.created_at).toBeTruthy()
      expect(evidence.updated_at).toBeTruthy()
      expect(evidence.verification.total_categories).toBe(4)
      expect(evidence.verification.categories_complete).toBe(1)
      expect(evidence.verification.categories_partial).toBe(1)
      expect(evidence.verification.categories_missing).toBe(1)
      expect(evidence.verification.categories_not_applicable).toBe(1)
      expect(evidence.verification.all_gaps_acknowledged).toBe(false)
      expect(evidence.verification.verification_status).toBe('gaps_remaining')
      expect(evidence.category_gaps).toHaveLength(4)
      expect(evidence.completion_summary).toContain('complete')
    })

    it('marks status as passed when all gaps acknowledged', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles).map((g) =>
        g.gap_status === 'partial' || g.gap_status === 'missing'
          ? { ...g, acknowledged: true }
          : g
      )
      const evidence = buildVerificationEvidence(gaps)
      expect(evidence.verification.verification_status).toBe('passed')
      expect(evidence.verification.all_gaps_acknowledged).toBe(true)
    })
  })

  describe('validateVerificationGate', () => {
    it('fails when critical gaps are unacknowledged', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles)
      const result = validateVerificationGate(gaps)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('2 remaining')
    })

    it('passes when all critical gaps are acknowledged', () => {
      const gaps = calculateGaps(inventoryCategories, uploadedFiles).map((g) =>
        g.gap_status === 'partial' || g.gap_status === 'missing'
          ? { ...g, acknowledged: true }
          : g
      )
      const result = validateVerificationGate(gaps)
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('passes when there are no critical gaps', () => {
      const cats = [
        { category_id: 'a', category_name: 'A', exists: true, file_count_estimate: 1, location_notes: '', is_custom: false },
      ]
      const files = [{ file_id: '1', file_name: 'a.pdf', category: 'a' }]
      const gaps = calculateGaps(cats, files)
      const result = validateVerificationGate(gaps)
      expect(result.valid).toBe(true)
    })
  })

  describe('extractInventoryCategories', () => {
    it('extracts categories from valid evidence', () => {
      const evidence = {
        inventory_type: 'documentation_inventory',
        categories: [
          { category_id: 'a', category_name: 'A', exists: true, file_count_estimate: 1 },
        ],
      }
      const result = extractInventoryCategories(evidence)
      expect(result).toHaveLength(1)
      expect(result[0].category_id).toBe('a')
    })

    it('returns empty array for null evidence', () => {
      expect(extractInventoryCategories(null)).toEqual([])
    })

    it('returns empty array for wrong evidence type', () => {
      expect(extractInventoryCategories({ inventory_type: 'other' })).toEqual([])
    })
  })

  describe('extractUploadedFiles', () => {
    it('extracts files from valid evidence', () => {
      const evidence = {
        evidence_type: 'documentation_files',
        files: [{ file_id: '1', file_name: 'a.pdf', category: 'specs' }],
      }
      const result = extractUploadedFiles(evidence)
      expect(result).toHaveLength(1)
      expect(result[0].file_name).toBe('a.pdf')
    })

    it('returns empty array for null evidence', () => {
      expect(extractUploadedFiles(null)).toEqual([])
    })

    it('returns empty array for wrong evidence type', () => {
      expect(extractUploadedFiles({ evidence_type: 'other' })).toEqual([])
    })
  })
})
