/**
 * File type configuration for Step 2.3 — documentation gathering.
 * Defines allowed MIME types, file constraints, and icon mapping.
 */

import type { LucideIcon } from 'lucide-react'
import {
  FileText,
  Table2,
  Image,
  Archive,
  File,
  FileCode,
  Presentation,
} from 'lucide-react'

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB
export const MAX_FILES_PER_UPLOAD = 100
export const MAX_TOTAL_SIZE_BYTES = 500 * 1024 * 1024 // 500MB
export const MIN_FILE_SIZE_BYTES = 1024 // 1KB

export interface AllowedFileType {
  extensions: string[]
  mimeTypes: string[]
  icon: LucideIcon
  label: string
}

export const ALLOWED_FILE_TYPES: AllowedFileType[] = [
  {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    icon: FileText,
    label: 'PDF',
  },
  {
    extensions: ['.docx', '.doc'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
    icon: FileText,
    label: 'Word',
  },
  {
    extensions: ['.xlsx', '.xls', '.csv'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ],
    icon: Table2,
    label: 'Spreadsheet',
  },
  {
    extensions: ['.txt'],
    mimeTypes: ['text/plain'],
    icon: FileText,
    label: 'Text',
  },
  {
    extensions: ['.md'],
    mimeTypes: ['text/markdown', 'text/x-markdown'],
    icon: FileCode,
    label: 'Markdown',
  },
  {
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'],
    icon: Image,
    label: 'Image',
  },
  {
    extensions: ['.zip', '.tar', '.gz'],
    mimeTypes: ['application/zip', 'application/x-tar', 'application/gzip'],
    icon: Archive,
    label: 'Archive',
  },
  {
    extensions: ['.pptx', '.odp'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation',
    ],
    icon: Presentation,
    label: 'Presentation',
  },
]

/**
 * Get the icon for a file based on its name extension.
 */
export function getFileIcon(fileName: string): LucideIcon {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase()
  for (const fileType of ALLOWED_FILE_TYPES) {
    if (fileType.extensions.includes(ext)) {
      return fileType.icon
    }
  }
  return File
}

/**
 * Get the label for a file type based on extension.
 */
export function getFileTypeLabel(fileName: string): string {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase()
  for (const fileType of ALLOWED_FILE_TYPES) {
    if (fileType.extensions.includes(ext)) {
      return fileType.label
    }
  }
  return 'File'
}

/**
 * Check if a file extension is allowed.
 */
export function isAllowedExtension(fileName: string): boolean {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase()
  return ALLOWED_FILE_TYPES.some((ft) => ft.extensions.includes(ext))
}

/**
 * Format file size to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Validate a file against constraints.
 */
export function validateFile(file: File): { valid: boolean; error: string | null } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds ${formatFileSize(MAX_FILE_SIZE_BYTES)} limit` }
  }
  if (file.size < MIN_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File is too small (must be at least 1 KB)' }
  }
  if (!isAllowedExtension(file.name)) {
    return { valid: false, error: `File type not supported: .${file.name.split('.').pop()}` }
  }
  return { valid: true, error: null }
}
