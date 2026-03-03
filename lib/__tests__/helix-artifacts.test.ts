import { describe, it, expect } from 'vitest'
import {
  HELIX_STAGES,
  HELIX_ARTIFACT_PREFIX,
  extractStepKeyFromName,
  getStageNumberFromStepKey,
  isHelixArtifact,
} from '@/lib/helix/helix-artifacts'

describe('helix-artifacts', () => {
  describe('HELIX_STAGES', () => {
    it('has 2 stages configured', () => {
      expect(HELIX_STAGES).toHaveLength(2)
    })

    it('Stage 1 is Planning with 3 steps', () => {
      const stage1 = HELIX_STAGES[0]
      expect(stage1.number).toBe(1)
      expect(stage1.name).toBe('Planning')
      expect(stage1.steps).toHaveLength(3)
    })

    it('Stage 2 is Documentation with 4 steps', () => {
      const stage2 = HELIX_STAGES[1]
      expect(stage2.number).toBe(2)
      expect(stage2.name).toBe('Documentation')
      expect(stage2.steps).toHaveLength(4)
    })

    it('each step has key and name', () => {
      for (const stage of HELIX_STAGES) {
        for (const step of stage.steps) {
          expect(step.key).toBeTruthy()
          expect(step.name).toBeTruthy()
        }
      }
    })

    it('step keys are unique', () => {
      const keys = HELIX_STAGES.flatMap((s) => s.steps.map((st) => st.key))
      expect(new Set(keys).size).toBe(keys.length)
    })
  })

  describe('HELIX_ARTIFACT_PREFIX', () => {
    it('is "Helix Step"', () => {
      expect(HELIX_ARTIFACT_PREFIX).toBe('Helix Step')
    })
  })

  describe('extractStepKeyFromName', () => {
    it('extracts step key from standard name', () => {
      expect(extractStepKeyFromName('Helix Step 2.1 — Identify Documentation')).toBe('2.1')
    })

    it('extracts step key from step 1.1', () => {
      expect(extractStepKeyFromName('Helix Step 1.1 — Project Idea')).toBe('1.1')
    })

    it('extracts step key from step 2.4', () => {
      expect(extractStepKeyFromName('Helix Step 2.4 — Verify Documentation')).toBe('2.4')
    })

    it('returns null for non-Helix artifact names', () => {
      expect(extractStepKeyFromName('My Document.pdf')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(extractStepKeyFromName('')).toBeNull()
    })

    it('returns null for partial match', () => {
      expect(extractStepKeyFromName('Helix Step')).toBeNull()
    })
  })

  describe('getStageNumberFromStepKey', () => {
    it('returns 1 for step 1.1', () => {
      expect(getStageNumberFromStepKey('1.1')).toBe(1)
    })

    it('returns 2 for step 2.3', () => {
      expect(getStageNumberFromStepKey('2.3')).toBe(2)
    })

    it('returns null for invalid key', () => {
      expect(getStageNumberFromStepKey('abc')).toBeNull()
    })
  })

  describe('isHelixArtifact', () => {
    it('returns true for Helix artifact names', () => {
      expect(isHelixArtifact('Helix Step 1.1 — Project Idea')).toBe(true)
      expect(isHelixArtifact('Helix Step 2.4 — Verify Documentation')).toBe(true)
    })

    it('returns false for regular artifact names', () => {
      expect(isHelixArtifact('My Document.pdf')).toBe(false)
      expect(isHelixArtifact('report.xlsx')).toBe(false)
      expect(isHelixArtifact('')).toBe(false)
    })
  })
})
