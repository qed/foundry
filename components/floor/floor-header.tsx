'use client'

import Image from 'next/image'
import { useRef } from 'react'
import {
  Columns3,
  List,
  Plus,
  PanelRightClose,
  PanelRightOpen,
  UserCheck,
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  Wand2,
  Settings2,
  Key,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloorHeaderProps {
  totalWorkOrders: number
  doneWorkOrders: number
  view: 'kanban' | 'table'
  onViewChange: (view: 'kanban' | 'table') => void
  rightPanelOpen: boolean
  onToggleRightPanel: () => void
  onNewWorkOrder: () => void
  myWorkOrdersActive?: boolean
  onToggleMyWorkOrders?: () => void
  myWorkOrdersCount?: number
  searchQuery: string
  onSearchChange: (query: string) => void
  activeFilterCount: number
  filterPanelOpen: boolean
  onToggleFilterPanel: () => void
  onExtractFromBlueprints: () => void
  onSuggestPhases: () => void
  onOpenStrategyConfig: () => void
  onOpenConnections: () => void
}

export function FloorHeader({
  totalWorkOrders,
  doneWorkOrders,
  view,
  onViewChange,
  rightPanelOpen,
  onToggleRightPanel,
  onNewWorkOrder,
  myWorkOrdersActive,
  onToggleMyWorkOrders,
  myWorkOrdersCount,
  searchQuery,
  onSearchChange,
  activeFilterCount,
  filterPanelOpen,
  onToggleFilterPanel,
  onExtractFromBlueprints,
  onSuggestPhases,
  onOpenStrategyConfig,
  onOpenConnections,
}: FloorHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
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
          /{totalWorkOrders} complete
        </span>
        {totalWorkOrders > 0 && (
          <>
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
              {completionPercent}%
            </span>
            <span className="w-20 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
              <span
                className={cn(
                  'block h-full rounded-full transition-all',
                  completionPercent >= 100 ? 'bg-accent-success' : 'bg-accent-cyan'
                )}
                style={{ width: `${completionPercent}%` }}
              />
            </span>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search input */}
      <div className="relative hidden sm:flex items-center">
        <Search className="absolute left-2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search work orders..."
          className="w-40 lg:w-52 bg-bg-primary border border-border-default rounded-lg pl-7 pr-7 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-cyan transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange('')
              searchInputRef.current?.focus()
            }}
            className="absolute right-2 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Filter button */}
      <div className="relative">
        <button
          onClick={onToggleFilterPanel}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
            filterPanelOpen || activeFilterCount > 0
              ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border-border-default'
          )}
          title="Filter work orders"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && (
            <span className="text-[10px] bg-accent-cyan/20 text-accent-cyan rounded-full px-1.5 py-0.5 ml-0.5">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* My Work Orders filter */}
      {onToggleMyWorkOrders && (
        <button
          onClick={onToggleMyWorkOrders}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
            myWorkOrdersActive
              ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border-border-default'
          )}
          title="Filter to my work orders"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">My Work</span>
          {myWorkOrdersActive && myWorkOrdersCount !== undefined && (
            <span className="text-[10px] bg-accent-cyan/20 text-accent-cyan rounded-full px-1.5 py-0.5 ml-0.5">
              {myWorkOrdersCount}
            </span>
          )}
        </button>
      )}

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

      {/* Settings */}
      <button
        onClick={onOpenConnections}
        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        title="API connections"
      >
        <Key className="w-4 h-4" />
      </button>
      <button
        onClick={onOpenStrategyConfig}
        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        title="Extraction strategy settings"
      >
        <Settings2 className="w-4 h-4" />
      </button>

      {/* AI actions */}
      <button
        onClick={onSuggestPhases}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10"
        title="Suggest phase plan using AI"
      >
        <Wand2 className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">Plan</span>
      </button>
      <button
        onClick={onExtractFromBlueprints}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10"
        title="Extract work orders from blueprints"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">Extract</span>
      </button>

      {/* New Work Order button */}
      <button
        onClick={onNewWorkOrder}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-cyan text-bg-primary rounded-lg text-xs font-medium hover:bg-accent-cyan/80 transition-colors"
        title="Create work order"
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
