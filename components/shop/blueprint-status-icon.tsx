'use client'

import { Check, Circle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlueprintStatus } from '@/types/database'

interface BlueprintStatusIconProps {
  status: BlueprintStatus | null
  className?: string
}

const ICON_CONFIG: Record<string, { icon: typeof Check; colorClass: string; tooltip: string }> = {
  approved: { icon: Check, colorClass: 'text-accent-success', tooltip: 'Blueprint: Approved' },
  implemented: { icon: Check, colorClass: 'text-accent-success', tooltip: 'Blueprint: Implemented' },
  in_review: { icon: Circle, colorClass: 'text-accent-warning', tooltip: 'Blueprint: In Review' },
  draft: { icon: Circle, colorClass: 'text-text-tertiary', tooltip: 'Blueprint: Draft' },
}

export function BlueprintStatusIcon({ status, className }: BlueprintStatusIconProps) {
  if (status === null) {
    return (
      <span title="No blueprint — click to create" className={cn('flex-shrink-0', className)}>
        <X className="w-3 h-3 text-accent-error/60" />
      </span>
    )
  }

  const config = ICON_CONFIG[status]
  if (!config) return null

  const Icon = config.icon
  const isFilled = status === 'approved' || status === 'implemented' || status === 'in_review'

  return (
    <span title={config.tooltip} className={cn('flex-shrink-0', className)}>
      <Icon
        className={cn('w-3 h-3', config.colorClass)}
        fill={isFilled ? 'currentColor' : 'none'}
        strokeWidth={isFilled ? 0 : 2}
      />
    </span>
  )
}
