'use client'

import {
  Lightbulb, Layers, BookOpen, ClipboardList, MessageSquare, Paperclip,
} from 'lucide-react'
import type { GraphEntityType } from '@/types/database'

const ENTITY_TYPE_CONFIG: Record<GraphEntityType, {
  icon: typeof Lightbulb
  colorClass: string
  label: string
}> = {
  idea: { icon: Lightbulb, colorClass: 'text-accent-warning', label: 'Idea' },
  feature: { icon: Layers, colorClass: 'text-accent-cyan', label: 'Feature' },
  blueprint: { icon: BookOpen, colorClass: 'text-accent-purple', label: 'Blueprint' },
  work_order: { icon: ClipboardList, colorClass: 'text-accent-success', label: 'Work Order' },
  feedback: { icon: MessageSquare, colorClass: 'text-accent-error', label: 'Feedback' },
  artifact: { icon: Paperclip, colorClass: 'text-text-secondary', label: 'Artifact' },
}

export function getEntityTypeLabel(type: GraphEntityType): string {
  return ENTITY_TYPE_CONFIG[type]?.label || type
}

interface EntityTypeIconProps {
  type: GraphEntityType
  className?: string
}

export function EntityTypeIcon({ type, className = 'w-3.5 h-3.5' }: EntityTypeIconProps) {
  const config = ENTITY_TYPE_CONFIG[type]
  if (!config) return null
  const Icon = config.icon
  return <Icon className={`${config.colorClass} ${className}`} />
}
