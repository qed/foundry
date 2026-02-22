/** Accepted file extensions and their MIME types */
export const ACCEPTED_EXTENSIONS: Record<string, string[]> = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  md: ['text/markdown', 'text/x-markdown'],
  txt: ['text/plain'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  csv: ['text/csv'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  mp3: ['audio/mpeg'],
  wav: ['audio/wav', 'audio/x-wav'],
  m4a: ['audio/mp4', 'audio/x-m4a'],
  aac: ['audio/aac'],
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export const ACCEPTED_EXTENSIONS_LIST = Object.keys(ACCEPTED_EXTENSIONS)

/** File type categories for display */
export type FileCategory = 'document' | 'image' | 'spreadsheet' | 'audio' | 'other'

const CATEGORY_MAP: Record<string, FileCategory> = {
  pdf: 'document',
  docx: 'document',
  md: 'document',
  txt: 'document',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  csv: 'spreadsheet',
  xlsx: 'spreadsheet',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  aac: 'audio',
}

export function getFileCategory(extension: string): FileCategory {
  return CATEGORY_MAP[extension.toLowerCase()] || 'other'
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function isAcceptedType(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ext in ACCEPTED_EXTENSIONS
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const ext = getFileExtension(file.name)
  if (!ACCEPTED_EXTENSIONS[ext]) {
    return { valid: false, error: `File type .${ext} is not supported` }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds 50MB limit' }
  }
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' }
  }
  return { valid: true }
}

/** Build accept string for file input */
export function getAcceptString(): string {
  return Object.values(ACCEPTED_EXTENSIONS).flat().join(',')
}
