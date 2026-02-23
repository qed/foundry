'use client'

import { cn } from '@/lib/utils'
import type { IdeaMaturityTier } from '@/types/database'

const TIER_CONFIG: Record<IdeaMaturityTier, { label: string; bgClass: string; textClass: string }> = {
  raw: { label: 'Raw', bgClass: 'bg-text-tertiary/10', textClass: 'text-text-tertiary' },
  developing: { label: 'Developing', bgClass: 'bg-accent-warning/10', textClass: 'text-accent-warning' },
  mature: { label: 'Mature', bgClass: 'bg-accent-success/10', textClass: 'text-accent-success' },
}

interface MaturityBadgeProps {
  tier: IdeaMaturityTier
  score?: number
  className?: string
}

export function MaturityBadge({ tier, score, className }: MaturityBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.raw

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
        config.bgClass,
        config.textClass,
        className
      )}
      title={score !== undefined ? `Maturity: ${score}/100` : undefined}
    >
      {config.label}
      {score !== undefined && (
        <span className="opacity-70">{score}</span>
      )}
    </span>
  )
}
