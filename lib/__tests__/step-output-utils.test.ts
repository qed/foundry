import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getEvidenceIcon,
  generatePreview,
  formatRelativeTime,
  formatAbsoluteTime,
  getStepStatus,
  getEvidenceTypeLabel,
} from '@/lib/helix/step-output-utils'
import { FolderOpen, BookOpen, FileText, CheckCircle2, File } from 'lucide-react'

describe('step-output-utils', () => {
  describe('getEvidenceIcon', () => {
    it('returns FolderOpen for documentation_inventory', () => {
      expect(getEvidenceIcon('documentation_inventory')).toBe(FolderOpen)
    })

    it('returns BookOpen for knowledge_capture', () => {
      expect(getEvidenceIcon('knowledge_capture')).toBe(BookOpen)
    })

    it('returns FileText for documentation_files', () => {
      expect(getEvidenceIcon('documentation_files')).toBe(FileText)
    })

    it('returns CheckCircle2 for documentation_verification', () => {
      expect(getEvidenceIcon('documentation_verification')).toBe(CheckCircle2)
    })

    it('returns File for unknown type', () => {
      expect(getEvidenceIcon('unknown_type')).toBe(File)
    })
  })

  describe('generatePreview', () => {
    it('generates inventory preview', () => {
      const data = {
        evidence_type: 'documentation_inventory',
        categories: [
          { category_id: 'a', exists: true },
          { category_id: 'b', exists: true },
          { category_id: 'c', exists: false },
        ],
      }
      expect(generatePreview(data)).toBe('3 categories, 2 with content')
    })

    it('generates inventory preview with no categories', () => {
      const data = { evidence_type: 'documentation_inventory' }
      expect(generatePreview(data)).toBe('No inventory data')
    })

    it('generates knowledge capture preview with char count', () => {
      const data = {
        evidence_type: 'knowledge_capture',
        sections: {
          a: { content: 'A'.repeat(60) },
          b: { content: 'B'.repeat(60) },
          c: { content: 'short' },
        },
        total_characters: 125,
      }
      expect(generatePreview(data)).toBe('2 of 3 sections, 125 chars')
    })

    it('generates knowledge capture preview without char count', () => {
      const data = {
        evidence_type: 'knowledge_capture',
        sections: {
          a: { content: 'A'.repeat(60) },
        },
      }
      expect(generatePreview(data)).toBe('1 of 1 sections')
    })

    it('handles knowledge capture with no sections', () => {
      const data = { evidence_type: 'knowledge_capture' }
      expect(generatePreview(data)).toBe('No knowledge data')
    })

    it('generates files preview', () => {
      const data = {
        evidence_type: 'documentation_files',
        total_files: 5,
        total_size_bytes: 1024 * 1024 * 10,
      }
      expect(generatePreview(data)).toBe('5 files, 10.0 MB')
    })

    it('generates single file preview', () => {
      const data = {
        evidence_type: 'documentation_files',
        total_files: 1,
        total_size_bytes: 2048,
      }
      expect(generatePreview(data)).toBe('1 file, 2.0 KB')
    })

    it('handles files with no count', () => {
      const data = { evidence_type: 'documentation_files' }
      expect(generatePreview(data)).toBe('No files')
    })

    it('generates verification preview with gaps', () => {
      const data = {
        evidence_type: 'documentation_verification',
        verification: {
          categories_complete: 8,
          categories_partial: 1,
          categories_missing: 1,
        },
      }
      expect(generatePreview(data)).toBe('8 complete, 2 gaps acknowledged')
    })

    it('generates verification preview without gaps', () => {
      const data = {
        evidence_type: 'documentation_verification',
        verification: {
          categories_complete: 10,
          categories_partial: 0,
          categories_missing: 0,
        },
      }
      expect(generatePreview(data)).toBe('10 categories complete')
    })

    it('handles verification with no data', () => {
      const data = { evidence_type: 'documentation_verification' }
      expect(generatePreview(data)).toBe('No verification data')
    })

    it('returns fallback for unknown type', () => {
      const data = { evidence_type: 'unknown' }
      expect(generatePreview(data)).toBe('Evidence data')
    })

    it('returns fallback for no evidence type', () => {
      expect(generatePreview({})).toBe('Evidence data')
    })
  })

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-03T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "Just now" for less than 60 seconds', () => {
      expect(formatRelativeTime('2026-03-03T11:59:30Z')).toBe('Just now')
    })

    it('returns minutes ago', () => {
      expect(formatRelativeTime('2026-03-03T11:45:00Z')).toBe('15 minutes ago')
    })

    it('returns singular minute', () => {
      expect(formatRelativeTime('2026-03-03T11:59:00Z')).toBe('1 minute ago')
    })

    it('returns hours ago', () => {
      expect(formatRelativeTime('2026-03-03T09:00:00Z')).toBe('3 hours ago')
    })

    it('returns days ago', () => {
      expect(formatRelativeTime('2026-03-01T12:00:00Z')).toBe('2 days ago')
    })

    it('returns formatted date for older than 7 days', () => {
      const result = formatRelativeTime('2026-02-20T12:00:00Z')
      expect(result).toContain('Feb')
      expect(result).toContain('20')
      expect(result).toContain('2026')
    })

    it('returns "Just now" for future dates', () => {
      expect(formatRelativeTime('2026-03-03T13:00:00Z')).toBe('Just now')
    })
  })

  describe('formatAbsoluteTime', () => {
    it('formats as readable date with time', () => {
      const result = formatAbsoluteTime('2026-02-28T14:30:00Z')
      expect(result).toContain('Feb')
      expect(result).toContain('28')
      expect(result).toContain('2026')
    })
  })

  describe('getStepStatus', () => {
    it('returns complete for "complete"', () => {
      expect(getStepStatus('complete')).toBe('complete')
    })

    it('returns in_progress for "active"', () => {
      expect(getStepStatus('active')).toBe('in_progress')
    })

    it('returns incomplete for "locked"', () => {
      expect(getStepStatus('locked')).toBe('incomplete')
    })

    it('returns incomplete for unknown status', () => {
      expect(getStepStatus('something')).toBe('incomplete')
    })
  })

  describe('getEvidenceTypeLabel', () => {
    it('returns correct labels', () => {
      expect(getEvidenceTypeLabel('documentation_inventory')).toBe('Documentation Inventory')
      expect(getEvidenceTypeLabel('knowledge_capture')).toBe('Knowledge Capture')
      expect(getEvidenceTypeLabel('documentation_files')).toBe('Documentation Files')
      expect(getEvidenceTypeLabel('documentation_verification')).toBe('Documentation Verification')
    })

    it('returns "Evidence" for unknown type', () => {
      expect(getEvidenceTypeLabel('unknown')).toBe('Evidence')
    })
  })
})
