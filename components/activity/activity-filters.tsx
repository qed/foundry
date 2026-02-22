'use client'

import { Search, X } from 'lucide-react'

export interface ActivityLogFilters {
  userId: string
  action: string
  entityType: string
  fromDate: string
  toDate: string
  search: string
}

interface ActivityFiltersProps {
  filters: ActivityLogFilters
  onChange: (filters: ActivityLogFilters) => void
}

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'idea', label: 'Ideas' },
  { value: 'feature_node', label: 'Features' },
  { value: 'blueprint', label: 'Blueprints' },
  { value: 'work_order', label: 'Work Orders' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'artifact', label: 'Artifacts' },
  { value: 'comment', label: 'Comments' },
  { value: 'member', label: 'Members' },
  { value: 'tag', label: 'Tags' },
  { value: 'connection', label: 'Connections' },
]

const ACTION_CATEGORY_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'status_changed', label: 'Status changed' },
  { value: 'member', label: 'Member changes' },
]

export function ActivityFilters({ filters, onChange }: ActivityFiltersProps) {
  const hasFilters =
    filters.search || filters.action || filters.entityType || filters.fromDate || filters.toDate

  function update(partial: Partial<ActivityLogFilters>) {
    onChange({ ...filters, ...partial })
  }

  function clearAll() {
    onChange({ userId: '', action: '', entityType: '', fromDate: '', toDate: '', search: '' })
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search activity..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="w-full pl-9 pr-8 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
        />
        {filters.search && (
          <button
            onClick={() => update({ search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-tertiary hover:text-text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.entityType}
          onChange={(e) => update({ entityType: e.target.value })}
          className="px-3 py-1.5 bg-bg-secondary border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
        >
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.action}
          onChange={(e) => update({ action: e.target.value })}
          className="px-3 py-1.5 bg-bg-secondary border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
        >
          {ACTION_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.fromDate}
          onChange={(e) => update({ fromDate: e.target.value })}
          placeholder="From date"
          className="px-3 py-1.5 bg-bg-secondary border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
        />

        <input
          type="date"
          value={filters.toDate}
          onChange={(e) => update({ toDate: e.target.value })}
          placeholder="To date"
          className="px-3 py-1.5 bg-bg-secondary border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
        />

        {hasFilters && (
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
