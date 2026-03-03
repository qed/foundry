import { describe, it, expect } from 'vitest'
import {
  validateStep21Evidence,
  validateStep22Evidence,
  validateStep23Evidence,
  validateStep24Evidence,
  checkDocumentationGate,
} from '@/lib/helix/documentation-gate'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeInventoryEvidence(checked: number, total: number) {
  const categories = Array.from({ length: total }, (_, i) => ({
    category_id: `cat_${i}`,
    exists: i < checked,
    file_count_estimate: i < checked ? 3 : 0,
  }))
  return { inventory_type: 'documentation_inventory', categories }
}

function makeKnowledgeEvidence(sectionsWithContent: number) {
  const sections: Record<string, { content: string }> = {}
  for (let i = 0; i < 8; i++) {
    sections[`section_${i}`] = {
      content: i < sectionsWithContent ? 'A'.repeat(60) : '',
    }
  }
  return { evidence_type: 'knowledge_capture', sections }
}

function makeFilesEvidence(fileCount: number) {
  const files = Array.from({ length: fileCount }, (_, i) => ({
    file_id: `file_${i}`,
    file_name: `doc_${i}.pdf`,
    file_size_bytes: 1024,
    category: 'specs',
  }))
  return { evidence_type: 'documentation_files', files, total_files: fileCount }
}

function makeVerificationEvidence(allAcked: boolean, unackedCount = 0) {
  const gaps = allAcked
    ? [{ acknowledged: true }, { acknowledged: true }]
    : Array.from({ length: unackedCount || 2 }, (_, i) => ({
        acknowledged: i === 0,
      }))
  return {
    evidence_type: 'documentation_verification',
    verification: {
      all_gaps_acknowledged: allAcked,
      verification_status: allAcked ? 'passed' : 'gaps_remaining',
      categories_complete: 8,
      categories_partial: allAcked ? 0 : 1,
      categories_missing: allAcked ? 0 : 1,
    },
    category_gaps: gaps,
  }
}

function makeCompleteSteps() {
  return [
    { stepKey: '2.1', status: 'complete', evidenceData: makeInventoryEvidence(3, 10) },
    { stepKey: '2.2', status: 'complete', evidenceData: makeKnowledgeEvidence(4) },
    { stepKey: '2.3', status: 'complete', evidenceData: makeFilesEvidence(5) },
    { stepKey: '2.4', status: 'complete', evidenceData: makeVerificationEvidence(true) },
  ]
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('documentation-gate', () => {
  describe('validateStep21Evidence', () => {
    it('passes with categories marked as existing', () => {
      const result = validateStep21Evidence(makeInventoryEvidence(3, 10))
      expect(result.status).toBe('pass')
      expect(result.detail).toContain('3 of 10')
    })

    it('fails with no categories marked as existing', () => {
      const result = validateStep21Evidence(makeInventoryEvidence(0, 10))
      expect(result.status).toBe('fail')
      expect(result.detail).toContain('none marked')
    })

    it('fails with null evidence', () => {
      const result = validateStep21Evidence(null)
      expect(result.status).toBe('fail')
    })

    it('fails with wrong evidence type', () => {
      const result = validateStep21Evidence({ inventory_type: 'other' })
      expect(result.status).toBe('fail')
    })
  })

  describe('validateStep22Evidence', () => {
    it('passes with 3+ sections with content', () => {
      const result = validateStep22Evidence(makeKnowledgeEvidence(4))
      expect(result.status).toBe('pass')
      expect(result.detail).toContain('4 sections')
    })

    it('fails with fewer than 3 sections', () => {
      const result = validateStep22Evidence(makeKnowledgeEvidence(2))
      expect(result.status).toBe('fail')
      expect(result.detail).toContain('2 of 8')
    })

    it('fails with null evidence', () => {
      const result = validateStep22Evidence(null)
      expect(result.status).toBe('fail')
    })

    it('fails with wrong evidence type', () => {
      const result = validateStep22Evidence({ evidence_type: 'other' })
      expect(result.status).toBe('fail')
    })

    it('handles HTML content stripping', () => {
      const evidence = {
        evidence_type: 'knowledge_capture',
        sections: {
          a: { content: '<p>' + 'A'.repeat(60) + '</p>' },
          b: { content: '<p>' + 'B'.repeat(60) + '</p>' },
          c: { content: '<p>' + 'C'.repeat(60) + '</p>' },
        },
      }
      const result = validateStep22Evidence(evidence)
      expect(result.status).toBe('pass')
    })
  })

  describe('validateStep23Evidence', () => {
    it('passes with files uploaded', () => {
      const result = validateStep23Evidence(makeFilesEvidence(5))
      expect(result.status).toBe('pass')
      expect(result.detail).toContain('5 files')
    })

    it('passes with 1 file', () => {
      const result = validateStep23Evidence(makeFilesEvidence(1))
      expect(result.status).toBe('pass')
      expect(result.detail).toContain('1 file ')
    })

    it('fails with 0 files', () => {
      const result = validateStep23Evidence(makeFilesEvidence(0))
      expect(result.status).toBe('fail')
    })

    it('fails with null evidence', () => {
      const result = validateStep23Evidence(null)
      expect(result.status).toBe('fail')
    })

    it('fails with wrong evidence type', () => {
      const result = validateStep23Evidence({ evidence_type: 'other' })
      expect(result.status).toBe('fail')
    })
  })

  describe('validateStep24Evidence', () => {
    it('passes when all gaps acknowledged', () => {
      const result = validateStep24Evidence(makeVerificationEvidence(true))
      expect(result.status).toBe('pass')
      expect(result.detail).toContain('acknowledged')
    })

    it('fails when gaps not acknowledged', () => {
      const result = validateStep24Evidence(makeVerificationEvidence(false))
      expect(result.status).toBe('fail')
      expect(result.detail).toContain('not acknowledged')
    })

    it('fails with null evidence', () => {
      const result = validateStep24Evidence(null)
      expect(result.status).toBe('fail')
    })

    it('fails with missing verification object', () => {
      const result = validateStep24Evidence({
        evidence_type: 'documentation_verification',
      })
      expect(result.status).toBe('fail')
      expect(result.detail).toContain('missing')
    })
  })

  describe('checkDocumentationGate', () => {
    it('passes when all steps complete and quality checks pass', () => {
      const result = checkDocumentationGate(makeCompleteSteps())
      expect(result.gateStatus).toBe('passed')
      expect(result.passedChecks).toBe(result.totalChecks)
      expect(result.blockingIssues).toHaveLength(0)
      expect(result.stageNumber).toBe(2)
      expect(result.stageName).toBe('Documentation')
    })

    it('fails when a step is incomplete', () => {
      const steps = makeCompleteSteps()
      steps[2].status = 'active' // Step 2.3 not complete
      const result = checkDocumentationGate(steps)
      expect(result.gateStatus).toBe('failed')
      expect(result.blockingIssues.length).toBeGreaterThan(0)
      expect(result.blockingIssues[0]).toContain('2.3')
    })

    it('fails when quality check fails', () => {
      const steps = makeCompleteSteps()
      steps[1].evidenceData = makeKnowledgeEvidence(1) // Only 1 section
      const result = checkDocumentationGate(steps)
      expect(result.gateStatus).toBe('failed')
      expect(result.qualityChecks[1].status).toBe('fail')
    })

    it('fails when step is missing', () => {
      const steps = makeCompleteSteps().slice(0, 3) // Remove step 2.4
      const result = checkDocumentationGate(steps)
      expect(result.gateStatus).toBe('failed')
      const step24Check = result.stepChecks.find((s) => s.stepKey === '2.4')
      expect(step24Check?.status).toBe('incomplete')
    })

    it('reports correct counts', () => {
      const steps = makeCompleteSteps()
      steps[0].status = 'active' // 2.1 incomplete
      const result = checkDocumentationGate(steps)
      expect(result.totalChecks).toBe(8) // 4 steps + 4 quality
      expect(result.stepChecks).toHaveLength(4)
      expect(result.qualityChecks).toHaveLength(4)
    })

    it('handles empty steps array', () => {
      const result = checkDocumentationGate([])
      expect(result.gateStatus).toBe('failed')
      expect(result.passedChecks).toBe(0)
      expect(result.blockingIssues.length).toBe(8) // All 8 checks fail
    })

    it('includes step names in step checks', () => {
      const result = checkDocumentationGate(makeCompleteSteps())
      expect(result.stepChecks[0].stepName).toBe('Identify Documentation')
      expect(result.stepChecks[1].stepName).toBe('Capture Knowledge')
      expect(result.stepChecks[2].stepName).toBe('Gather Documentation')
      expect(result.stepChecks[3].stepName).toBe('Verify Documentation')
    })
  })
})
