'use client'

import Image from 'next/image'
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShopStats {
  epics: number
  features: number
  subFeatures: number
  tasks: number
  completionPercent: number
}

interface ShopHeaderProps {
  stats: ShopStats
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  onToggleLeftPanel: () => void
  onToggleRightPanel: () => void
}

export function ShopHeader({
  stats,
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeftPanel,
  onToggleRightPanel,
}: ShopHeaderProps) {
  const totalNodes =
    stats.epics + stats.features + stats.subFeatures + stats.tasks

  return (
    <div className="h-14 flex items-center gap-3 px-4 border-b border-border-default bg-bg-secondary flex-shrink-0">
      {/* Left panel toggle */}
      <button
        onClick={onToggleLeftPanel}
        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        title={leftPanelOpen ? 'Collapse feature tree' : 'Expand feature tree'}
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
          src="/icon-shop.png"
          alt="Pattern Shop"
          width={28}
          height={28}
          className="flex-shrink-0"
        />
        <h1 className="text-sm font-semibold text-text-primary truncate hidden sm:block">
          The Pattern Shop
        </h1>
      </div>

      {/* Stats bar */}
      {totalNodes > 0 && (
        <div className="hidden md:flex items-center gap-4 ml-4 text-xs text-text-secondary">
          <span>
            <span className="font-medium text-text-primary">{stats.epics}</span>{' '}
            {stats.epics === 1 ? 'Epic' : 'Epics'}
          </span>
          <span className="text-border-default">|</span>
          <span>
            <span className="font-medium text-text-primary">
              {stats.features}
            </span>{' '}
            {stats.features === 1 ? 'Feature' : 'Features'}
          </span>
          <span className="text-border-default">|</span>
          <span>
            <span className="font-medium text-text-primary">
              {stats.subFeatures}
            </span>{' '}
            Sub
          </span>
          <span className="text-border-default">|</span>
          <span>
            <span className="font-medium text-text-primary">{stats.tasks}</span>{' '}
            {stats.tasks === 1 ? 'Task' : 'Tasks'}
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
            {stats.completionPercent}% complete
          </span>
        </div>
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
