'use client'

import {
  CheckCircle2, ArrowDown, Link2, Network, GitFork, AlertTriangle, PlusCircle,
} from 'lucide-react'
import type { EntityConnectionType } from '@/types/database'

interface ConnectionTypeConfig {
  icon: typeof CheckCircle2
  colorClass: string
  label: string
}

export const CONNECTION_TYPE_CONFIG: Record<EntityConnectionType, ConnectionTypeConfig> = {
  implements: { icon: CheckCircle2, colorClass: 'text-accent-success', label: 'Implements' },
  depends_on: { icon: ArrowDown, colorClass: 'text-accent-cyan', label: 'Depends On' },
  references: { icon: Link2, colorClass: 'text-accent-purple', label: 'References' },
  relates_to: { icon: Network, colorClass: 'text-accent-warning', label: 'Relates To' },
  derived_from: { icon: GitFork, colorClass: 'text-text-tertiary', label: 'Derived From' },
  conflicts_with: { icon: AlertTriangle, colorClass: 'text-accent-error', label: 'Conflicts With' },
  complements: { icon: PlusCircle, colorClass: 'text-accent-cyan', label: 'Complements' },
}

interface ConnectionTypeIconProps {
  type: EntityConnectionType
  className?: string
}

export function ConnectionTypeIcon({ type, className = 'w-3.5 h-3.5' }: ConnectionTypeIconProps) {
  const config = CONNECTION_TYPE_CONFIG[type]
  const Icon = config.icon
  return <Icon className={`${config.colorClass} ${className}`} />
}
