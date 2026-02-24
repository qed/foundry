import { describe, it, expect } from 'vitest'
import {
  getFileCategory,
  getFileExtension,
  isAcceptedType,
  formatFileSize,
  validateFile,
  getAcceptString,
  MAX_FILE_SIZE,
} from '@/lib/artifacts/file-types'

describe('getFileCategory', () => {
  it('categorizes document types', () => {
    expect(getFileCategory('pdf')).toBe('document')
    expect(getFileCategory('docx')).toBe('document')
    expect(getFileCategory('md')).toBe('document')
    expect(getFileCategory('txt')).toBe('document')
  })

  it('categorizes image types', () => {
    expect(getFileCategory('png')).toBe('image')
    expect(getFileCategory('jpg')).toBe('image')
    expect(getFileCategory('jpeg')).toBe('image')
  })

  it('categorizes spreadsheet types', () => {
    expect(getFileCategory('csv')).toBe('spreadsheet')
    expect(getFileCategory('xlsx')).toBe('spreadsheet')
  })

  it('categorizes audio types', () => {
    expect(getFileCategory('mp3')).toBe('audio')
    expect(getFileCategory('wav')).toBe('audio')
  })

  it('returns other for unknown extensions', () => {
    expect(getFileCategory('xyz')).toBe('other')
  })

  it('is case-insensitive', () => {
    expect(getFileCategory('PDF')).toBe('document')
    expect(getFileCategory('PNG')).toBe('image')
  })
})

describe('getFileExtension', () => {
  it('extracts extension from filename', () => {
    expect(getFileExtension('report.pdf')).toBe('pdf')
    expect(getFileExtension('image.PNG')).toBe('png')
  })

  it('handles multiple dots', () => {
    expect(getFileExtension('my.file.name.txt')).toBe('txt')
  })

  it('returns empty string for no extension', () => {
    expect(getFileExtension('noext')).toBe('noext')
  })
})

describe('isAcceptedType', () => {
  it('accepts valid file types', () => {
    expect(isAcceptedType('doc.pdf')).toBe(true)
    expect(isAcceptedType('image.png')).toBe(true)
    expect(isAcceptedType('data.csv')).toBe(true)
    expect(isAcceptedType('song.mp3')).toBe(true)
  })

  it('rejects invalid file types', () => {
    expect(isAcceptedType('file.exe')).toBe(false)
    expect(isAcceptedType('file.zip')).toBe(false)
  })
})

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('handles zero', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })
})

describe('validateFile', () => {
  function mockFile(name: string, size: number): File {
    return { name, size } as File
  }

  it('accepts valid files', () => {
    const result = validateFile(mockFile('report.pdf', 1024))
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('rejects unsupported types', () => {
    const result = validateFile(mockFile('script.exe', 1024))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('not supported')
  })

  it('rejects files over 50MB', () => {
    const result = validateFile(mockFile('big.pdf', MAX_FILE_SIZE + 1))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('50MB')
  })

  it('rejects empty files', () => {
    const result = validateFile(mockFile('empty.pdf', 0))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('empty')
  })
})

describe('getAcceptString', () => {
  it('returns a comma-separated MIME type list', () => {
    const result = getAcceptString()
    expect(result).toContain('application/pdf')
    expect(result).toContain('image/png')
    expect(result).toContain('text/csv')
  })
})
