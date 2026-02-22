'use client'

import { X } from 'lucide-react'
import type { FilterState } from './filter-panel'
import type { MemberInfo, FeatureInfo } from './work-order-table'

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

interface FilterBadgesProps {
  filters: FilterState
  search: string
  members: MemberInfo[]
  phases: { id: string; name: string }[]
  features: FeatureInfo[]
  onRemoveFilter: (key: keyof FilterState, value: string) => void
  onClearSearch: () => void
  onClearAll: () => void
}

export function FilterBadges({
  filters,
  search,
  members,
  phases,
  features,
  onRemoveFilter,
  onClearSearch,
  onClearAll,
}: FilterBadgesProps) {
  const memberMap = new Map(members.map((m) => [m.user_id, m.display_name]))
  const phaseMap = new Map(phases.map((p) => [p.id, p.name]))
  const featureMap = new Map(features.map((f) => [f.id, f.title]))

  const badges: { key: keyof FilterState | 'search'; value: string; label: string; category: string }[] = []

  if (search) {
    badges.push({ key: 'search', value: search, label: `"${search}"`, category: 'Search' })
  }

  for (const s of filters.statuses) {
    badges.push({ key: 'statuses', value: s, label: STATUS_LABELS[s] || s, category: 'Status' })
  }
  for (const p of filters.priorities) {
    badges.push({ key: 'priorities', value: p, label: PRIORITY_LABELS[p] || p, category: 'Priority' })
  }
  for (const a of filters.assignees) {
    const label = a === 'unassigned' ? 'Unassigned' : memberMap.get(a) || 'Unknown'
    badges.push({ key: 'assignees', value: a, label, category: 'Assignee' })
  }
  for (const p of filters.phases) {
    const label = p === 'unphased' ? 'Unphased' : phaseMap.get(p) || 'Unknown'
    badges.push({ key: 'phases', value: p, label, category: 'Phase' })
  }
  for (const f of filters.features) {
    const label = f === 'unlinked' ? 'No feature' : featureMap.get(f) || 'Unknown'
    badges.push({ key: 'features', value: f, label, category: 'Feature' })
  }

  if (badges.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-border-default bg-bg-secondary/50 flex-shrink-0 overflow-x-auto scrollbar-hide">
      {badges.map((badge) => (
        <span
          key={`${badge.key}-${badge.value}`}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-tertiary text-[10px] text-text-secondary whitespace-nowrap flex-shrink-0"
        >
          <span className="text-text-tertiary">{badge.category}:</span>
          <span className="text-text-primary">{badge.label}</span>
          <button
            onClick={() => {
              if (badge.key === 'search') {
                onClearSearch()
              } else {
                onRemoveFilter(badge.key, badge.value)
              }
            }}
            className="text-text-tertiary hover:text-text-primary transition-colors ml-0.5"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      {badges.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-[10px] text-accent-cyan hover:text-accent-cyan/80 transition-colors whitespace-nowrap flex-shrink-0 ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
