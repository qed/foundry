'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_OPTIONS, SORT_OPTIONS, type SortOption } from './types'

interface FilterBarProps {
  statusFilter: string | null
  onStatusChange: (status: string | null) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  onClearAll: () => void
  hasActiveFilters: boolean
}

export function FilterBar({
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  onClearAll,
  hasActiveFilters,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Status filter */}
      <div className="relative">
        <select
          value={statusFilter || ''}
          onChange={(e) => onStatusChange(e.target.value || null)}
          className={cn(
            'appearance-none bg-bg-secondary border border-border-default rounded-lg px-3 py-1.5 pr-8 text-sm text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent',
            statusFilter && 'border-accent-cyan/50'
          )}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-text-tertiary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Sort */}
      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className={cn(
            'appearance-none bg-bg-secondary border border-border-default rounded-lg px-3 py-1.5 pr-8 text-sm text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent'
          )}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-text-tertiary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Active filter chips */}
      {statusFilter && (
        <button
          onClick={() => onStatusChange(null)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25 transition-colors"
        >
          Status: {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label}
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={onClearAll}
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
