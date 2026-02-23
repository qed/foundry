'use client'

import Image from 'next/image'
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoomStats {
  foundations: number
  systemDiagrams: number
  featureBlueprints: number
  completionPercent: number
}

interface RoomHeaderProps {
  stats: RoomStats
  driftCount?: number
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  onToggleLeftPanel: () => void
  onToggleRightPanel: () => void
  onToggleDriftPanel?: () => void
}

export function RoomHeader({
  stats,
  driftCount = 0,
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeftPanel,
  onToggleRightPanel,
  onToggleDriftPanel,
}: RoomHeaderProps) {
  const total = stats.foundations + stats.systemDiagrams + stats.featureBlueprints

  return (
    <div className="h-14 flex items-center gap-3 px-4 border-b border-border-default bg-bg-secondary flex-shrink-0">
      {/* Left panel toggle */}
      <button
        onClick={onToggleLeftPanel}
        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        title={leftPanelOpen ? 'Collapse blueprint panel' : 'Expand blueprint panel'}
      >
        {leftPanelOpen ? (
          <PanelLeftClose className="w-4 h-4" />
        ) : (
          <PanelLeftOpen className="w-4 h-4" />
        )}
      </button>

      {/* Title */}
      <div className="flex items-center gap-2 min-w-0">
        <Image
          src="/icon-room.png"
          alt="Control Room"
          width={28}
          height={28}
          className="flex-shrink-0"
        />
        <h1 className="text-sm font-semibold text-text-primary truncate hidden sm:block">
          The Control Room
        </h1>
      </div>

      {/* Stats bar */}
      {total > 0 && (
        <div className="hidden md:flex items-center gap-4 ml-4 text-xs text-text-secondary">
          <span>
            <span className="font-medium text-text-primary">{stats.foundations}</span>{' '}
            {stats.foundations === 1 ? 'Foundation' : 'Foundations'}
          </span>
          <span className="text-border-default">|</span>
          <span>
            <span className="font-medium text-text-primary">{stats.systemDiagrams}</span>{' '}
            {stats.systemDiagrams === 1 ? 'Diagram' : 'Diagrams'}
          </span>
          <span className="text-border-default">|</span>
          <span>
            <span className="font-medium text-text-primary">{stats.featureBlueprints}</span>{' '}
            Feature
          </span>
          <span className="text-border-default">|</span>
          <span
            className={cn(
              'font-medium',
              stats.completionPercent >= 100
                ? 'text-accent-success'
                : stats.completionPercent > 0
                  ? 'text-accent-cyan'
                  : 'text-text-tertiary'
            )}
          >
            {stats.completionPercent}% approved
          </span>
        </div>
      )}

      {/* Drift alerts indicator */}
      {driftCount > 0 && (
        <button
          onClick={onToggleDriftPanel}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent-warning/10 text-accent-warning hover:bg-accent-warning/15 transition-colors"
          title={`${driftCount} drift alert${driftCount !== 1 ? 's' : ''}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{driftCount}</span>
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right panel toggle */}
      <button
        onClick={onToggleRightPanel}
        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        title={rightPanelOpen ? 'Collapse agent panel' : 'Expand agent panel'}
      >
        {rightPanelOpen ? (
          <PanelRightClose className="w-4 h-4" />
        ) : (
          <PanelRightOpen className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
