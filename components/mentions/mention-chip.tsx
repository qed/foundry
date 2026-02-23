'use client'

import { User, FileText, ClipboardList, Paperclip, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MentionType } from '@/lib/mentions/types'

interface MentionChipProps {
  type: MentionType
  name: string
  mentionedId: string
  onClick?: () => void
}

const TYPE_CONFIG: Record<MentionType, {
  icon: typeof User
  bgClass: string
  textClass: string
  label: string
}> = {
  user: {
    icon: User,
    bgClass: 'bg-accent-cyan/15',
    textClass: 'text-accent-cyan',
    label: 'User',
  },
  requirement_doc: {
    icon: FileText,
    bgClass: 'bg-accent-purple/15',
    textClass: 'text-accent-purple',
    label: 'Document',
  },
  blueprint: {
    icon: BookOpen,
    bgClass: 'bg-accent-purple/15',
    textClass: 'text-accent-purple',
    label: 'Blueprint',
  },
  work_order: {
    icon: ClipboardList,
    bgClass: 'bg-accent-warning/15',
    textClass: 'text-accent-warning',
    label: 'Work Order',
  },
  artifact: {
    icon: Paperclip,
    bgClass: 'bg-text-tertiary/15',
    textClass: 'text-text-secondary',
    label: 'Artifact',
  },
}

export function MentionChip({ type, name, mentionedId: _mentionedId, onClick }: MentionChipProps) {
  const config = TYPE_CONFIG[type]
  const Icon = config.icon

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
      className={cn(
        'inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs font-medium align-baseline',
        config.bgClass,
        config.textClass,
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity'
      )}
      title={`${config.label}: ${name}`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="truncate max-w-[120px]">@{name}</span>
    </span>
  )
}
