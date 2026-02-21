'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_OPTIONS, SORT_OPTIONS, type SortOption } from './types'
import { TagFilter } from './tag-filter'
import type { Tag } from '@/types/database'

interface FilterBarProps {
  statusFilter: string | null
  onStatusChange: (status: string | null) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  projectTags: Tag[]
  searchValue: string
  onClearSearch: () => void
  onClearAll: () => void
  hasActiveFilters: boolean
  total: number
}

export function FilterBar({
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  selectedTagIds,
  onTagsChange,
  projectTags,
  searchValue,
  onClearSearch,
  onClearAll,
  hasActiveFilters,
  total,
}: FilterBarProps) {
  const selectedTags = projectTags.filter((t) => selectedTagIds.includes(t.id))
  const hasChips = !!searchValue || !!statusFilter || selectedTagIds.length > 0

  return (
    <div className="mb-6 space-y-3">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
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

        {/* Tag filter */}
        <TagFilter
          selectedTagIds={selectedTagIds}
          onChange={onTagsChange}
          tags={projectTags}
        />

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

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Clear all
          </button>
        )}

        {/* Result count when filtered */}
        {hasActiveFilters && (
          <span className="text-xs text-text-tertiary ml-auto">
            {total} {total === 1 ? 'idea' : 'ideas'} found
          </span>
        )}
      </div>

      {/* Active filter chips */}
      {hasChips && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Search chip */}
          {searchValue && (
            <button
              onClick={onClearSearch}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25 transition-colors"
            >
              Search: &ldquo;{searchValue}&rdquo;
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Status chip */}
          {statusFilter && (
            <button
              onClick={() => onStatusChange(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25 transition-colors"
            >
              Status: {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label}
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Tag chips */}
          {selectedTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                const newIds = selectedTagIds.filter((id) => id !== tag.id)
                onTagsChange(newIds)
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25 transition-colors"
            >
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
