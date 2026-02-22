'use client'

import Image from 'next/image'
import {
  Columns3,
  List,
  Plus,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloorHeaderProps {
  totalWorkOrders: number
  doneWorkOrders: number
  view: 'kanban' | 'table'
  onViewChange: (view: 'kanban' | 'table') => void
  rightPanelOpen: boolean
  onToggleRightPanel: () => void
}

export function FloorHeader({
  totalWorkOrders,
  doneWorkOrders,
  view,
  onViewChange,
  rightPanelOpen,
  onToggleRightPanel,
}: FloorHeaderProps) {
  const completionPercent =
    totalWorkOrders > 0
      ? Math.round((doneWorkOrders / totalWorkOrders) * 100)
      : 0

  return (
    <div className="h-14 flex items-center gap-3 px-4 border-b border-border-default bg-bg-secondary flex-shrink-0">
      {/* Title */}
      <div className="flex items-center gap-2 min-w-0">
        <Image
          src="/icon-floor.png"
          alt="Assembly Floor"
          width={28}
          height={28}
          className="flex-shrink-0"
        />
        <h1 className="text-sm font-semibold text-text-primary truncate hidden sm:block">
          The Assembly Floor
        </h1>
      </div>

      {/* Progress badge */}
      <div className="hidden md:flex items-center gap-2 ml-2">
        <span className="text-xs text-text-secondary">
          <span className="font-medium text-text-primary">{doneWorkOrders}</span>
          /{totalWorkOrders} work orders complete
        </span>
        {totalWorkOrders > 0 && (
          <span
            className={cn(
              'text-xs font-medium',
              completionPercent >= 100
                ? 'text-accent-success'
                : completionPercent > 0
                  ? 'text-accent-cyan'
                  : 'text-text-tertiary'
            )}
          >
            ({completionPercent}%)
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View toggle */}
      <div className="flex items-center rounded-lg border border-border-default overflow-hidden">
        <button
          onClick={() => onViewChange('kanban')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
            view === 'kanban'
              ? 'bg-accent-cyan/10 text-accent-cyan'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          )}
          title="Kanban view"
        >
          <Columns3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kanban</span>
        </button>
        <button
          onClick={() => onViewChange('table')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border-default',
            view === 'table'
              ? 'bg-accent-cyan/10 text-accent-cyan'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          )}
          title="Table view"
        >
          <List className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Table</span>
        </button>
      </div>

      {/* New Work Order button */}
      <button
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-cyan text-bg-primary rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
        title="Create work order (Phase 063)"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">New Work Order</span>
      </button>

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
