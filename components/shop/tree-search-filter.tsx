'use client'

import { useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Puzzle,
  Layers,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeatureStatus, FeatureLevel } from '@/types/database'

function useKeyboardShortcuts(inputRef: RefObject<HTMLInputElement | null>, onClearAll: () => void) {
  const clearAllRef = useRef(onClearAll)
  useEffect(() => {
    clearAllRef.current = onClearAll
  }, [onClearAll])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        e.preventDefault()
        clearAllRef.current()
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inputRef])
}

const STATUS_OPTIONS: { value: FeatureStatus; label: string; dotClass: string }[] = [
  { value: 'not_started', label: 'Not Started', dotClass: 'bg-text-tertiary' },
  { value: 'in_progress', label: 'In Progress', dotClass: 'bg-accent-cyan' },
  { value: 'complete', label: 'Complete', dotClass: 'bg-accent-success' },
  { value: 'blocked', label: 'Blocked', dotClass: 'bg-accent-error' },
]

const LEVEL_OPTIONS: { value: FeatureLevel; label: string; Icon: typeof FolderOpen }[] = [
  { value: 'epic', label: 'Epic', Icon: FolderOpen },
  { value: 'feature', label: 'Feature', Icon: Puzzle },
  { value: 'sub_feature', label: 'Sub-feature', Icon: Layers },
  { value: 'task', label: 'Task', Icon: CheckCircle2 },
]

export interface FilterInfo {
  matchCount: number
  statusCounts: Record<FeatureStatus, number>
  levelCounts: Record<FeatureLevel, number>
}

interface TreeSearchFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedStatuses: FeatureStatus[]
  onStatusChange: (statuses: FeatureStatus[]) => void
  selectedLevels: FeatureLevel[]
  onLevelChange: (levels: FeatureLevel[]) => void
  filterInfo: FilterInfo | null
  isFiltering: boolean
}

export function TreeSearchFilter({
  searchQuery,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  selectedLevels,
  onLevelChange,
  filterInfo,
  isFiltering,
}: TreeSearchFilterProps) {
  const [statusExpanded, setStatusExpanded] = useState(false)
  const [levelExpanded, setLevelExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasActiveFilters =
    searchQuery.length > 0 ||
    selectedStatuses.length < 4 ||
    selectedLevels.length < 4

  const handleClearAll = useCallback(() => {
    onSearchChange('')
    onStatusChange(['not_started', 'in_progress', 'complete', 'blocked'])
    onLevelChange(['epic', 'feature', 'sub_feature', 'task'])
    setStatusExpanded(false)
    setLevelExpanded(false)
  }, [onSearchChange, onStatusChange, onLevelChange])

  // Cmd/Ctrl+F keyboard shortcut
  useKeyboardShortcuts(inputRef, handleClearAll)

  const handleStatusToggle = (status: FeatureStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status))
    } else {
      onStatusChange([...selectedStatuses, status])
    }
  }

  const handleLevelToggle = (level: FeatureLevel) => {
    if (selectedLevels.includes(level)) {
      onLevelChange(selectedLevels.filter((l) => l !== level))
    } else {
      onLevelChange([...selectedLevels, level])
    }
  }

  return (
    <div className="border-b border-border-default">
      {/* Search input */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-bg-tertiary transition-colors"
              title="Clear search"
            >
              <X className="w-3 h-3 text-text-tertiary hover:text-text-primary" />
            </button>
          )}
        </div>

        {/* Result counter */}
        {isFiltering && filterInfo && (
          <div className="mt-1.5 text-[10px] text-text-tertiary">
            {filterInfo.matchCount === 0 ? (
              <span className="text-accent-error">No matching nodes</span>
            ) : (
              <span>{filterInfo.matchCount} result{filterInfo.matchCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>

      {/* Filter controls */}
      <div className="px-3 pb-2 space-y-1">
        {/* Status filter */}
        <div>
          <button
            onClick={() => setStatusExpanded(!statusExpanded)}
            className="w-full flex items-center gap-1 py-1 text-[10px] font-medium text-text-tertiary uppercase tracking-wider hover:text-text-secondary transition-colors"
          >
            {statusExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Status
            {selectedStatuses.length < 4 && (
              <span className="ml-auto text-accent-cyan normal-case tracking-normal">
                {selectedStatuses.length} selected
              </span>
            )}
          </button>

          {statusExpanded && (
            <div className="ml-4 space-y-0.5 mt-0.5 mb-1">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 py-0.5 text-[11px] cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(opt.value)}
                    onChange={() => handleStatusToggle(opt.value)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                      selectedStatuses.includes(opt.value)
                        ? 'border-accent-cyan bg-accent-cyan/20'
                        : 'border-border-default group-hover:border-text-tertiary'
                    )}
                  >
                    {selectedStatuses.includes(opt.value) && (
                      <CheckCircle2 className="w-2.5 h-2.5 text-accent-cyan" />
                    )}
                  </span>
                  <Circle className={cn('w-2 h-2 flex-shrink-0', opt.dotClass.replace('bg-', 'text-'))} fill="currentColor" strokeWidth={0} />
                  <span className="text-text-secondary group-hover:text-text-primary">
                    {opt.label}
                    {filterInfo && (
                      <span className="text-text-tertiary ml-1">({filterInfo.statusCounts[opt.value]})</span>
                    )}
                  </span>
                </label>
              ))}
              <div className="flex gap-2 mt-1 text-[10px]">
                <button
                  onClick={() => onStatusChange(['not_started', 'in_progress', 'complete', 'blocked'])}
                  className="text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                >
                  All
                </button>
                <button
                  onClick={() => onStatusChange([])}
                  className="text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                >
                  None
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Level filter */}
        <div>
          <button
            onClick={() => setLevelExpanded(!levelExpanded)}
            className="w-full flex items-center gap-1 py-1 text-[10px] font-medium text-text-tertiary uppercase tracking-wider hover:text-text-secondary transition-colors"
          >
            {levelExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Level
            {selectedLevels.length < 4 && (
              <span className="ml-auto text-accent-cyan normal-case tracking-normal">
                {selectedLevels.length} selected
              </span>
            )}
          </button>

          {levelExpanded && (
            <div className="ml-4 space-y-0.5 mt-0.5 mb-1">
              {LEVEL_OPTIONS.map((opt) => {
                const LevelIcon = opt.Icon
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 py-0.5 text-[11px] cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLevels.includes(opt.value)}
                      onChange={() => handleLevelToggle(opt.value)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                        selectedLevels.includes(opt.value)
                          ? 'border-accent-cyan bg-accent-cyan/20'
                          : 'border-border-default group-hover:border-text-tertiary'
                      )}
                    >
                      {selectedLevels.includes(opt.value) && (
                        <CheckCircle2 className="w-2.5 h-2.5 text-accent-cyan" />
                      )}
                    </span>
                    <LevelIcon className="w-3 h-3 text-text-tertiary flex-shrink-0" />
                    <span className="text-text-secondary group-hover:text-text-primary">
                      {opt.label}
                      {filterInfo && (
                        <span className="text-text-tertiary ml-1">({filterInfo.levelCounts[opt.value]})</span>
                      )}
                    </span>
                  </label>
                )
              })}
              <div className="flex gap-2 mt-1 text-[10px]">
                <button
                  onClick={() => onLevelChange(['epic', 'feature', 'sub_feature', 'task'])}
                  className="text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                >
                  All
                </button>
                <button
                  onClick={() => onLevelChange([])}
                  className="text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                >
                  None
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="w-full text-[10px] text-accent-cyan hover:text-accent-cyan/80 font-medium py-1 transition-colors"
          >
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  )
}
