'use client'

import { cn } from '@/lib/utils'

interface MaturityBarProps {
  completeness: number
  engagement: number
  age: number
  total: number
  className?: string
}

export function MaturityBar({ completeness, engagement, age, total, className }: MaturityBarProps) {
  // Normalize to percentage of 100
  const compPct = (completeness / 40) * 100
  const engPct = (engagement / 40) * 100
  const agePct = (age / 20) * 100

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Overall score */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-tertiary uppercase tracking-wide">Maturity</span>
        <span className="text-xs font-medium text-text-primary">{total}/100</span>
      </div>

      {/* Stacked bar */}
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden flex">
        {completeness > 0 && (
          <div
            className="h-full bg-accent-cyan transition-all"
            style={{ width: `${completeness}%` }}
            title={`Completeness: ${completeness}/40`}
          />
        )}
        {engagement > 0 && (
          <div
            className="h-full bg-accent-purple transition-all"
            style={{ width: `${engagement}%` }}
            title={`Engagement: ${engagement}/40`}
          />
        )}
        {age > 0 && (
          <div
            className="h-full bg-accent-warning transition-all"
            style={{ width: `${age}%` }}
            title={`Freshness: ${age}/20`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-text-tertiary">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-accent-cyan" />
          <span>Complete {Math.round(compPct)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-accent-purple" />
          <span>Engagement {Math.round(engPct)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-accent-warning" />
          <span>Fresh {Math.round(agePct)}%</span>
        </div>
      </div>
    </div>
  )
}
