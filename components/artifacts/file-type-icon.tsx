'use client'

import { FileText, Image, Music, Table2, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getFileCategory } from '@/lib/artifacts/file-types'

const ICON_MAP = {
  document: FileText,
  image: Image,
  audio: Music,
  spreadsheet: Table2,
  other: File,
}

const COLOR_MAP = {
  document: 'text-accent-cyan',
  image: 'text-accent-purple',
  audio: 'text-accent-warning',
  spreadsheet: 'text-accent-success',
  other: 'text-text-tertiary',
}

interface FileTypeIconProps {
  fileType: string
  className?: string
}

export function FileTypeIcon({ fileType, className }: FileTypeIconProps) {
  const category = getFileCategory(fileType)
  const Icon = ICON_MAP[category]
  const color = COLOR_MAP[category]

  return <Icon className={cn('w-4 h-4', color, className)} />
}
