import { describe, it, expect } from 'vitest'
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_UPLOAD,
  MAX_TOTAL_SIZE_BYTES,
  MIN_FILE_SIZE_BYTES,
  getFileIcon,
  getFileTypeLabel,
  isAllowedExtension,
  formatFileSize,
  validateFile,
} from '@/lib/helix/file-types'
import { File as LucideFile, FileText, Table2, Image, Archive, FileCode, Presentation } from 'lucide-react'

describe('file-types (helix)', () => {
  describe('ALLOWED_FILE_TYPES', () => {
    it('has 8 file type groups', () => {
      expect(ALLOWED_FILE_TYPES).toHaveLength(8)
    })

    it('each group has required fields', () => {
      for (const ft of ALLOWED_FILE_TYPES) {
        expect(ft.extensions.length).toBeGreaterThan(0)
        expect(ft.mimeTypes.length).toBeGreaterThan(0)
        expect(ft.icon).toBeTruthy()
        expect(ft.label).toBeTruthy()
      }
    })

    it('all extensions start with a dot', () => {
      for (const ft of ALLOWED_FILE_TYPES) {
        for (const ext of ft.extensions) {
          expect(ext).toMatch(/^\./)
        }
      }
    })
  })

  describe('constants', () => {
    it('MAX_FILE_SIZE_BYTES is 50MB', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024)
    })

    it('MAX_FILES_PER_UPLOAD is 100', () => {
      expect(MAX_FILES_PER_UPLOAD).toBe(100)
    })

    it('MAX_TOTAL_SIZE_BYTES is 500MB', () => {
      expect(MAX_TOTAL_SIZE_BYTES).toBe(500 * 1024 * 1024)
    })

    it('MIN_FILE_SIZE_BYTES is 1KB', () => {
      expect(MIN_FILE_SIZE_BYTES).toBe(1024)
    })
  })

  describe('getFileIcon', () => {
    it('returns FileText for PDF', () => {
      expect(getFileIcon('report.pdf')).toBe(FileText)
    })

    it('returns FileText for Word docs', () => {
      expect(getFileIcon('doc.docx')).toBe(FileText)
      expect(getFileIcon('old.doc')).toBe(FileText)
    })

    it('returns Table2 for spreadsheets', () => {
      expect(getFileIcon('data.xlsx')).toBe(Table2)
      expect(getFileIcon('data.csv')).toBe(Table2)
    })

    it('returns Image for image files', () => {
      expect(getFileIcon('photo.png')).toBe(Image)
      expect(getFileIcon('image.jpg')).toBe(Image)
      expect(getFileIcon('pic.jpeg')).toBe(Image)
      expect(getFileIcon('anim.gif')).toBe(Image)
      expect(getFileIcon('icon.svg')).toBe(Image)
      expect(getFileIcon('photo.webp')).toBe(Image)
    })

    it('returns Archive for archives', () => {
      expect(getFileIcon('files.zip')).toBe(Archive)
      expect(getFileIcon('backup.tar')).toBe(Archive)
      expect(getFileIcon('data.gz')).toBe(Archive)
    })

    it('returns FileCode for markdown', () => {
      expect(getFileIcon('readme.md')).toBe(FileCode)
    })

    it('returns Presentation for presentations', () => {
      expect(getFileIcon('slides.pptx')).toBe(Presentation)
      expect(getFileIcon('deck.odp')).toBe(Presentation)
    })

    it('returns generic File icon for unknown extensions', () => {
      expect(getFileIcon('file.xyz')).toBe(LucideFile)
    })

    it('is case-insensitive', () => {
      expect(getFileIcon('REPORT.PDF')).toBe(FileText)
      expect(getFileIcon('Image.PNG')).toBe(Image)
    })
  })

  describe('getFileTypeLabel', () => {
    it('returns correct labels', () => {
      expect(getFileTypeLabel('doc.pdf')).toBe('PDF')
      expect(getFileTypeLabel('doc.docx')).toBe('Word')
      expect(getFileTypeLabel('data.xlsx')).toBe('Spreadsheet')
      expect(getFileTypeLabel('data.csv')).toBe('Spreadsheet')
      expect(getFileTypeLabel('note.txt')).toBe('Text')
      expect(getFileTypeLabel('readme.md')).toBe('Markdown')
      expect(getFileTypeLabel('photo.png')).toBe('Image')
      expect(getFileTypeLabel('files.zip')).toBe('Archive')
      expect(getFileTypeLabel('slides.pptx')).toBe('Presentation')
    })

    it('returns File for unknown types', () => {
      expect(getFileTypeLabel('unknown.xyz')).toBe('File')
    })
  })

  describe('isAllowedExtension', () => {
    it('allows supported extensions', () => {
      expect(isAllowedExtension('report.pdf')).toBe(true)
      expect(isAllowedExtension('data.xlsx')).toBe(true)
      expect(isAllowedExtension('photo.png')).toBe(true)
      expect(isAllowedExtension('readme.md')).toBe(true)
      expect(isAllowedExtension('notes.txt')).toBe(true)
    })

    it('rejects unsupported extensions', () => {
      expect(isAllowedExtension('program.exe')).toBe(false)
      expect(isAllowedExtension('script.sh')).toBe(false)
      expect(isAllowedExtension('data.sql')).toBe(false)
    })

    it('is case-insensitive', () => {
      expect(isAllowedExtension('FILE.PDF')).toBe(true)
      expect(isAllowedExtension('IMAGE.PNG')).toBe(true)
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B')
    })

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(5120)).toBe('5.0 KB')
    })

    it('formats megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
    })

    it('formats gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
    })
  })

  describe('validateFile', () => {
    function createMockFile(name: string, size: number): File {
      const blob = new Blob(['x'.repeat(size)])
      return new File([blob], name, { type: 'application/octet-stream' })
    }

    it('accepts valid files', () => {
      const file = createMockFile('report.pdf', 2048)
      const result = validateFile(file)
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('rejects files exceeding max size', () => {
      const file = createMockFile('big.pdf', MAX_FILE_SIZE_BYTES + 1)
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('limit')
    })

    it('rejects files below min size', () => {
      const file = createMockFile('tiny.pdf', 100)
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too small')
    })

    it('rejects unsupported file types', () => {
      const file = createMockFile('script.exe', 2048)
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not supported')
    })
  })
})
