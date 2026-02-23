'use client'

import { cn } from '@/lib/utils'

interface ConfidenceBarProps {
  confidence: number
  showLabel?: boolean
  className?: string
}

export function ConfidenceBar({ confidence, showLabel = true, className }: ConfidenceBarProps) {
  const color =
    confidence >= 90
      ? 'bg-accent-success'
      : confidence >= 70
        ? 'bg-accent-cyan'
        : confidence >= 50
          ? 'bg-accent-warning'
          : 'bg-accent-error'

  const label =
    confidence >= 90
      ? 'Very High'
      : confidence >= 70
        ? 'High'
        : confidence >= 50
          ? 'Medium'
          : 'Low'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden min-w-[48px]">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.min(100, confidence)}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] text-text-tertiary whitespace-nowrap">
          {confidence}% {label}
        </span>
      )}
    </div>
  )
}
