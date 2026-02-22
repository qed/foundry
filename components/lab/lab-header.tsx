'use client'

import Image from 'next/image'
import { RefreshCw, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LabStats {
  total: number
  newCount: number
  triaged: number
  converted: number
}

interface LabHeaderProps {
  stats: LabStats
  isRefreshing: boolean
  onRefresh: () => void
  agentPanelOpen: boolean
  onToggleAgent: () => void
}

interface StatBadgeProps {
  label: string
  value: number
  color: string
}

function StatBadge({ label, value, color }: StatBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg', color)}>
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-[10px] font-medium opacity-80">{label}</span>
    </div>
  )
}

export function LabHeader({
  stats,
  isRefreshing,
  onRefresh,
  agentPanelOpen,
  onToggleAgent,
}: LabHeaderProps) {
  return (
    <div className="h-14 flex items-center gap-3 px-4 border-b border-border-default bg-bg-secondary flex-shrink-0">
      {/* Title */}
      <div className="flex items-center gap-2 min-w-0">
        <Image
          src="/icon-lab.png"
          alt="Insights Lab"
          width={28}
          height={28}
          className="flex-shrink-0"
        />
        <h1 className="text-sm font-semibold text-text-primary truncate hidden sm:block">
          The Insights Lab
        </h1>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-2 ml-2">
        <StatBadge label="Total" value={stats.total} color="bg-bg-tertiary text-text-primary" />
        <StatBadge label="New" value={stats.newCount} color="bg-accent-cyan/10 text-accent-cyan" />
        <StatBadge label="Triaged" value={stats.triaged} color="bg-accent-warning/10 text-accent-warning" />
        <StatBadge label="Converted" value={stats.converted} color="bg-accent-success/10 text-accent-success" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
        title="Refresh feedback"
      >
        <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
      </button>

      {/* Agent toggle */}
      <button
        onClick={onToggleAgent}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          agentPanelOpen
            ? 'bg-accent-purple/10 text-accent-purple'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
        )}
        title={agentPanelOpen ? 'Close agent panel' : 'Open agent panel'}
      >
        <Bot className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Agent</span>
      </button>
    </div>
  )
}
