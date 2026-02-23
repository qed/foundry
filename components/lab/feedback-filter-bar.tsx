'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search,
  X,
  ChevronDown,
  Check,
  SlidersHorizontal,
  Calendar,
  Gauge,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────

export interface FeedbackFilters {
  search: string
  categories: string[]
  statuses: string[]
  tags: string[]
  dateFrom: string
  dateTo: string
  scoreMin: number
  scoreMax: number
}

export const EMPTY_FILTERS: FeedbackFilters = {
  search: '',
  categories: [],
  statuses: [],
  tags: [],
  dateFrom: '',
  dateTo: '',
  scoreMin: 0,
  scoreMax: 100,
}

interface FeedbackFilterBarProps {
  projectId: string
  filters: FeedbackFilters
  onFiltersChange: (filters: FeedbackFilters) => void
  activeFilterCount: number
}

// ─── Static Options ─────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'ux_issue', label: 'UX Issue' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
  { value: 'uncategorized', label: 'Uncategorized' },
]

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'converted', label: 'Converted' },
  { value: 'archived', label: 'Archived' },
]

const DATE_PRESETS = [
  { label: 'Last 24h', days: 1 },
  { label: 'Last 7d', days: 7 },
  { label: 'Last 30d', days: 30 },
  { label: 'Last 90d', days: 90 },
]

// ─── Main Component ─────────────────────────────────────────────────────

export function FeedbackFilterBar({
  projectId,
  filters,
  onFiltersChange,
  activeFilterCount,
}: FeedbackFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchLocal, setSearchLocal] = useState(filters.search)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [projectTags, setProjectTags] = useState<string[]>([])

  // Fetch project tags for the tag filter
  useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch(`/api/projects/${projectId}/feedback/tags`)
        if (res.ok) {
          const data = await res.json()
          setProjectTags(data.tags || [])
        }
      } catch { /* ignore */ }
    }
    fetchTags()
  }, [projectId])

  // Sync local search with external filter
  useEffect(() => {
    async function doSync() { setSearchLocal(filters.search) }
    doSync()
  }, [filters.search])

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchLocal(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: value })
    }, 300)
  }, [filters, onFiltersChange])

  const clearSearch = useCallback(() => {
    setSearchLocal('')
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    onFiltersChange({ ...filters, search: '' })
  }, [filters, onFiltersChange])

  const updateFilter = useCallback(<K extends keyof FeedbackFilters>(key: K, value: FeedbackFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }, [filters, onFiltersChange])

  const clearAll = useCallback(() => {
    setSearchLocal('')
    onFiltersChange(EMPTY_FILTERS)
  }, [onFiltersChange])

  // Build filter chips
  const chips: { type: keyof FeedbackFilters | 'date' | 'score'; label: string }[] = []
  if (filters.search) {
    chips.push({ type: 'search', label: `"${filters.search}"` })
  }
  if (filters.categories.length > 0) {
    chips.push({ type: 'categories', label: `Category: ${filters.categories.length}` })
  }
  if (filters.statuses.length > 0) {
    chips.push({ type: 'statuses', label: `Status: ${filters.statuses.length}` })
  }
  if (filters.tags.length > 0) {
    chips.push({ type: 'tags', label: `Tags: ${filters.tags.length}` })
  }
  if (filters.dateFrom || filters.dateTo) {
    const label = filters.dateFrom && filters.dateTo
      ? `${filters.dateFrom} - ${filters.dateTo}`
      : filters.dateFrom
        ? `From ${filters.dateFrom}`
        : `Until ${filters.dateTo}`
    chips.push({ type: 'date', label: `Date: ${label}` })
  }
  if (filters.scoreMin > 0 || filters.scoreMax < 100) {
    chips.push({ type: 'score', label: `Score: ${filters.scoreMin}–${filters.scoreMax}` })
  }

  const removeChip = (type: string) => {
    switch (type) {
      case 'search': clearSearch(); break
      case 'categories': updateFilter('categories', []); break
      case 'statuses': updateFilter('statuses', []); break
      case 'tags': updateFilter('tags', []); break
      case 'date': onFiltersChange({ ...filters, dateFrom: '', dateTo: '' }); break
      case 'score': onFiltersChange({ ...filters, scoreMin: 0, scoreMax: 100 }); break
    }
  }

  return (
    <div className="border-b border-border-default bg-bg-secondary sticky top-0 z-10 flex-shrink-0">
      <div className="px-4 py-2 space-y-2">
        {/* Search row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={searchLocal}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search feedback..."
              className="w-full pl-8 pr-8 py-1.5 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-cyan transition-colors"
            />
            {searchLocal && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter toggle for mobile */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              isExpanded || activeFilterCount > 0
                ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border-border-default'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="text-[10px] bg-accent-cyan/20 text-accent-cyan rounded-full px-1.5 py-0.5">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter dropdowns — always visible on lg, toggled on mobile */}
        {isExpanded && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <MultiSelectDropdown
              label="Category"
              options={CATEGORY_OPTIONS}
              selectedValues={filters.categories}
              onChange={(v) => updateFilter('categories', v)}
            />
            <MultiSelectDropdown
              label="Status"
              options={STATUS_OPTIONS}
              selectedValues={filters.statuses}
              onChange={(v) => updateFilter('statuses', v)}
            />
            <MultiSelectDropdown
              label="Tags"
              options={projectTags.map((t) => ({ value: t, label: t }))}
              selectedValues={filters.tags}
              onChange={(v) => updateFilter('tags', v)}
              icon={<Tag className="w-3 h-3" />}
              emptyText="No tags in project"
            />
            <DateRangeDropdown
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onChange={(from, to) => onFiltersChange({ ...filters, dateFrom: from, dateTo: to })}
            />
            <ScoreRangeInput
              min={filters.scoreMin}
              max={filters.scoreMax}
              onChange={(min, max) => onFiltersChange({ ...filters, scoreMin: min, scoreMax: max })}
            />
          </div>
        )}

        {/* Filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip.type}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-cyan/10 text-accent-cyan rounded text-[10px] font-medium"
              >
                {chip.label}
                <button onClick={() => removeChip(chip.type)} className="hover:opacity-70">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAll}
              className="text-[10px] text-text-tertiary hover:text-text-primary font-medium ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MultiSelectDropdown ────────────────────────────────────────────────

function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  icon,
  emptyText,
}: {
  label: string
  options: { value: string; label: string }[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  icon?: React.ReactNode
  emptyText?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  const toggleAll = () => {
    if (selectedValues.length === options.length) {
      onChange([])
    } else {
      onChange(options.map((o) => o.value))
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border transition-colors',
          selectedValues.length > 0
            ? 'bg-accent-cyan/5 text-accent-cyan border-accent-cyan/30'
            : 'text-text-secondary hover:text-text-primary bg-bg-primary border-border-default'
        )}
      >
        <span className="flex items-center gap-1.5 truncate">
          {icon}
          {selectedValues.length > 0
            ? `${label}: ${selectedValues.length}`
            : label}
        </span>
        <ChevronDown className={cn('w-3 h-3 transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-20 max-h-[200px] overflow-y-auto py-1">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-text-tertiary">
              {emptyText || 'No options'}
            </div>
          ) : (
            <>
              <button
                onClick={toggleAll}
                className="w-full text-left px-3 py-1.5 text-[10px] font-medium text-text-secondary hover:bg-bg-tertiary transition-colors border-b border-border-default"
              >
                {selectedValues.length === options.length ? 'Deselect all' : 'Select all'}
              </button>
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleValue(opt.value)}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary transition-colors flex items-center justify-between"
                >
                  {opt.label}
                  {selectedValues.includes(opt.value) && (
                    <Check className="w-3 h-3 text-accent-cyan flex-shrink-0" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── DateRangeDropdown ──────────────────────────────────────────────────

function DateRangeDropdown({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string
  dateTo: string
  onChange: (from: string, to: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const applyPreset = useCallback((days: number) => {
    const now = new Date()
    const to = now.toISOString().split('T')[0]
    const fromDate = new Date(now.getTime() - days * 86400000)
    const from = fromDate.toISOString().split('T')[0]
    onChange(from, to)
    setIsOpen(false)
  }, [onChange])

  const hasValue = dateFrom || dateTo

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border transition-colors',
          hasValue
            ? 'bg-accent-cyan/5 text-accent-cyan border-accent-cyan/30'
            : 'text-text-secondary hover:text-text-primary bg-bg-primary border-border-default'
        )}
      >
        <span className="flex items-center gap-1.5 truncate">
          <Calendar className="w-3 h-3" />
          {hasValue ? 'Date range' : 'Date'}
        </span>
        <ChevronDown className={cn('w-3 h-3 transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-20 min-w-[200px] py-1">
          {/* Presets */}
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.days}
              onClick={() => applyPreset(preset.days)}
              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              {preset.label}
            </button>
          ))}

          <div className="border-t border-border-default my-1" />

          {/* Custom date inputs */}
          <div className="px-3 py-2 space-y-1.5">
            <label className="text-[10px] text-text-tertiary">Custom range</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onChange(e.target.value, dateTo)}
                className="flex-1 px-2 py-1 bg-bg-primary border border-border-default rounded text-[10px] text-text-primary outline-none focus:border-accent-cyan"
              />
              <span className="text-[10px] text-text-tertiary">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onChange(dateFrom, e.target.value)}
                className="flex-1 px-2 py-1 bg-bg-primary border border-border-default rounded text-[10px] text-text-primary outline-none focus:border-accent-cyan"
              />
            </div>
          </div>

          {hasValue && (
            <>
              <div className="border-t border-border-default my-1" />
              <button
                onClick={() => { onChange('', ''); setIsOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-[10px] text-accent-error hover:bg-bg-tertiary transition-colors"
              >
                Clear date filter
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ScoreRangeInput ────────────────────────────────────────────────────

function ScoreRangeInput({
  min,
  max,
  onChange,
}: {
  min: number
  max: number
  onChange: (min: number, max: number) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [localMin, setLocalMin] = useState(min)
  const [localMax, setLocalMax] = useState(max)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function doSync() {
      setLocalMin(min)
      setLocalMax(max)
    }
    doSync()
  }, [min, max])

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const debouncedChange = useCallback((newMin: number, newMax: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onChange(Math.min(newMin, newMax), Math.max(newMin, newMax))
    }, 500)
  }, [onChange])

  const handleMinChange = (value: number) => {
    setLocalMin(value)
    debouncedChange(value, localMax)
  }

  const handleMaxChange = (value: number) => {
    setLocalMax(value)
    debouncedChange(localMin, value)
  }

  const hasValue = min > 0 || max < 100

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border transition-colors',
          hasValue
            ? 'bg-accent-cyan/5 text-accent-cyan border-accent-cyan/30'
            : 'text-text-secondary hover:text-text-primary bg-bg-primary border-border-default'
        )}
      >
        <span className="flex items-center gap-1.5 truncate">
          <Gauge className="w-3 h-3" />
          {hasValue ? `Score: ${min}–${max}` : 'Score'}
        </span>
        <ChevronDown className={cn('w-3 h-3 transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-20 min-w-[200px] p-3">
          <label className="text-[10px] text-text-tertiary mb-2 block">Score range (0–100)</label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-tertiary w-6">Min</span>
              <input
                type="range"
                min="0"
                max="100"
                value={localMin}
                onChange={(e) => handleMinChange(parseInt(e.target.value))}
                className="flex-1 accent-accent-cyan"
              />
              <span className="text-[10px] text-text-primary w-6 text-right">{localMin}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-tertiary w-6">Max</span>
              <input
                type="range"
                min="0"
                max="100"
                value={localMax}
                onChange={(e) => handleMaxChange(parseInt(e.target.value))}
                className="flex-1 accent-accent-cyan"
              />
              <span className="text-[10px] text-text-primary w-6 text-right">{localMax}</span>
            </div>
          </div>
          {hasValue && (
            <button
              onClick={() => { onChange(0, 100); setIsOpen(false) }}
              className="mt-2 text-[10px] text-accent-error hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  )
}
