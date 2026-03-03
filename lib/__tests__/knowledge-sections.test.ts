import { describe, it, expect } from 'vitest'
import {
  KNOWLEDGE_SECTIONS,
  MIN_SECTIONS_FOR_GATE,
  MIN_CHARS_PER_SECTION,
  getPlainTextCharCount,
  countCompletedSections,
  totalCharacterCount,
  buildKnowledgeEvidence,
  createInitialSections,
  validateKnowledgeGate,
} from '@/lib/helix/knowledge-sections'

describe('knowledge-sections', () => {
  describe('KNOWLEDGE_SECTIONS', () => {
    it('has exactly 8 sections', () => {
      expect(KNOWLEDGE_SECTIONS).toHaveLength(8)
    })

    it('each section has required fields', () => {
      for (const section of KNOWLEDGE_SECTIONS) {
        expect(section.id).toBeTruthy()
        expect(section.title).toBeTruthy()
        expect(section.description).toBeTruthy()
        expect(section.placeholder).toBeTruthy()
        expect(section.maxCharacters).toBe(5000)
      }
    })

    it('has unique section IDs', () => {
      const ids = KNOWLEDGE_SECTIONS.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('getPlainTextCharCount', () => {
    it('strips HTML tags', () => {
      expect(getPlainTextCharCount('<p>Hello <strong>world</strong></p>')).toBe(11)
    })

    it('returns 0 for empty HTML', () => {
      expect(getPlainTextCharCount('<p></p>')).toBe(0)
    })

    it('handles plain text', () => {
      expect(getPlainTextCharCount('Hello world')).toBe(11)
    })

    it('trims whitespace', () => {
      expect(getPlainTextCharCount('  hello  ')).toBe(5)
    })
  })

  describe('countCompletedSections', () => {
    it('returns 0 for empty sections', () => {
      const sections = createInitialSections()
      expect(countCompletedSections(sections)).toBe(0)
    })

    it('counts sections meeting minimum threshold', () => {
      const sections = createInitialSections()
      sections.domain_knowledge.content = 'A'.repeat(MIN_CHARS_PER_SECTION)
      sections.business_rules.content = 'B'.repeat(MIN_CHARS_PER_SECTION)
      sections.edge_cases.content = 'Short'
      expect(countCompletedSections(sections)).toBe(2)
    })

    it('ignores sections below threshold', () => {
      const sections = createInitialSections()
      sections.domain_knowledge.content = 'A'.repeat(MIN_CHARS_PER_SECTION - 1)
      expect(countCompletedSections(sections)).toBe(0)
    })
  })

  describe('totalCharacterCount', () => {
    it('sums all sections', () => {
      const sections = createInitialSections()
      sections.domain_knowledge.content = 'Hello' // 5 chars
      sections.business_rules.content = 'World!' // 6 chars
      expect(totalCharacterCount(sections)).toBe(11)
    })

    it('returns 0 for empty sections', () => {
      const sections = createInitialSections()
      expect(totalCharacterCount(sections)).toBe(0)
    })
  })

  describe('buildKnowledgeEvidence', () => {
    it('builds valid evidence object', () => {
      const sections = createInitialSections()
      sections.domain_knowledge.content = 'A'.repeat(100)
      const evidence = buildKnowledgeEvidence(sections)

      expect(evidence.evidence_type).toBe('knowledge_capture')
      expect(evidence.created_at).toBeTruthy()
      expect(evidence.updated_at).toBeTruthy()
      expect(evidence.sections_completed).toBe(1)
      expect(evidence.total_characters).toBe(100)
      expect(evidence.artifact_id).toBeNull()
    })

    it('includes artifact_id when provided', () => {
      const sections = createInitialSections()
      const evidence = buildKnowledgeEvidence(sections, 'art_123')
      expect(evidence.artifact_id).toBe('art_123')
    })
  })

  describe('createInitialSections', () => {
    it('creates 8 sections', () => {
      const sections = createInitialSections()
      expect(Object.keys(sections)).toHaveLength(8)
    })

    it('all sections start empty', () => {
      const sections = createInitialSections()
      for (const section of Object.values(sections)) {
        expect(section.content).toBe('')
        expect(section.character_count).toBe(0)
        expect(section.title).toBeTruthy()
      }
    })
  })

  describe('validateKnowledgeGate', () => {
    it('fails when fewer than 3 sections are complete', () => {
      const sections = createInitialSections()
      sections.domain_knowledge.content = 'A'.repeat(MIN_CHARS_PER_SECTION)
      sections.business_rules.content = 'B'.repeat(MIN_CHARS_PER_SECTION)
      const result = validateKnowledgeGate(sections)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least 3')
    })

    it('passes when 3+ sections are complete', () => {
      const sections = createInitialSections()
      sections.domain_knowledge.content = 'A'.repeat(MIN_CHARS_PER_SECTION)
      sections.business_rules.content = 'B'.repeat(MIN_CHARS_PER_SECTION)
      sections.edge_cases.content = 'C'.repeat(MIN_CHARS_PER_SECTION)
      const result = validateKnowledgeGate(sections)
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('passes with all 8 sections complete', () => {
      const sections = createInitialSections()
      for (const key of Object.keys(sections)) {
        sections[key].content = 'X'.repeat(MIN_CHARS_PER_SECTION)
      }
      const result = validateKnowledgeGate(sections)
      expect(result.valid).toBe(true)
    })
  })

  describe('constants', () => {
    it('MIN_SECTIONS_FOR_GATE is 3', () => {
      expect(MIN_SECTIONS_FOR_GATE).toBe(3)
    })

    it('MIN_CHARS_PER_SECTION is 50', () => {
      expect(MIN_CHARS_PER_SECTION).toBe(50)
    })
  })
})
