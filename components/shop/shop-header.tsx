'use client'

import Image from 'next/image'
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ShopStats {
  epics: number
  features: number
  subFeatures: number
  tasks: number
  completionPercent: number
  inProgressPercent: number
  blockedNodeCount: number
  statusBreakdown: {
    not_started: number
    in_progress: number
    complete: number
    blocked: number
  }
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

          {/* Progress indicator */}
          <span className="text-border-default">|</span>
          <div className="flex items-center gap-2">
            <DonutChart
              completionPercent={stats.completionPercent}
              inProgressPercent={stats.inProgressPercent}
              hasBlocked={stats.blockedNodeCount > 0}
            />
            <div className="flex flex-col">
              <span
                className={cn(
                  'font-medium leading-tight',
                  stats.completionPercent >= 100
                    ? 'text-accent-success'
                    : stats.completionPercent > 0
                      ? 'text-accent-cyan'
                      : 'text-text-tertiary'
                )}
              >
                {stats.completionPercent}% complete
              </span>
              <span className="text-[10px] text-text-tertiary leading-tight">
                {stats.statusBreakdown.complete} of {totalNodes} nodes
              </span>
            </div>
            {stats.blockedNodeCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent-error/15 text-accent-error text-[10px] font-medium">
                {stats.blockedNodeCount} blocked
              </span>
            )}
          </div>
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

function DonutChart({
  completionPercent,
  inProgressPercent,
  hasBlocked,
}: {
  completionPercent: number
  inProgressPercent: number
  hasBlocked: boolean
}) {
  const r = 12
  const circumference = 2 * Math.PI * r
  const completeOffset = circumference - (completionPercent / 100) * circumference
  const inProgressArc = (inProgressPercent / 100) * circumference
  const completeArc = (completionPercent / 100) * circumference

  return (
    <div className="relative w-8 h-8 flex-shrink-0">
      <svg width="32" height="32" viewBox="0 0 32 32">
        {/* Background ring */}
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          stroke="var(--color-bg-primary)"
          strokeWidth="3"
        />
        {/* In-progress arc (drawn first, behind complete) */}
        {inProgressPercent > 0 && (
          <circle
            cx="16"
            cy="16"
            r={r}
            fill="none"
            stroke="var(--color-accent-cyan)"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - completeArc - inProgressArc}
            strokeLinecap="round"
            transform="rotate(-90 16 16)"
            opacity={0.4}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        )}
        {/* Complete arc */}
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          stroke={hasBlocked ? 'var(--color-accent-error)' : 'var(--color-accent-success)'}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={completeOffset}
          strokeLinecap="round"
          transform="rotate(-90 16 16)"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[8px] font-bold text-text-primary">{completionPercent}%</span>
      </div>
    </div>
  )
}
