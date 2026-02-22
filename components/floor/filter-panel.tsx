'use client'

import { useState, useRef, useEffect } from 'react'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import type { WorkOrderStatus, WorkOrderPriority } from '@/types/database'
import type { MemberInfo, FeatureInfo } from './work-order-table'

interface FilterState {
  statuses: WorkOrderStatus[]
  priorities: WorkOrderPriority[]
  assignees: string[]
  phases: string[]
  features: string[]
}

interface FilterCounts {
  statuses: Record<string, number>
  priorities: Record<string, number>
  assignees: Record<string, number>
  phases: Record<string, number>
  features: Record<string, number>
}

interface FilterPanelProps {
  filters: FilterState
  counts: FilterCounts
  members: MemberInfo[]
  phases: { id: string; name: string }[]
  features: FeatureInfo[]
  onFiltersChange: (filters: FilterState) => void
  onClose: () => void
}

const STATUS_OPTIONS: { value: WorkOrderStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-text-tertiary' },
  { value: 'ready', label: 'Ready', color: 'bg-text-secondary' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-accent-cyan' },
  { value: 'in_review', label: 'In Review', color: 'bg-accent-purple' },
  { value: 'done', label: 'Done', color: 'bg-accent-success' },
]

const PRIORITY_OPTIONS: { value: WorkOrderPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-accent-error' },
  { value: 'high', label: 'High', color: 'bg-accent-warning' },
  { value: 'medium', label: 'Medium', color: 'bg-accent-cyan' },
  { value: 'low', label: 'Low', color: 'bg-text-tertiary' },
]

export function FilterPanel({
  filters,
  counts,
  members,
  phases,
  features,
  onFiltersChange,
  onClose,
}: FilterPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleValue = <K extends keyof FilterState>(key: K, value: FilterState[K][number]) => {
    const current = filters[key] as string[]
    const next = current.includes(value as string)
      ? current.filter((v) => v !== value)
      : [...current, value as string]
    onFiltersChange({ ...filters, [key]: next })
  }

  const totalActive =
    filters.statuses.length +
    filters.priorities.length +
    filters.assignees.length +
    filters.phases.length +
    filters.features.length

  const clearAll = () => {
    onFiltersChange({
      statuses: [],
      priorities: [],
      assignees: [],
      phases: [],
      features: [],
    })
  }

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-1 z-50 w-72 max-h-[70vh] overflow-y-auto bg-bg-secondary border border-border-default rounded-lg shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <span className="text-xs font-semibold text-text-primary">Filters</span>
        <div className="flex items-center gap-2">
          {totalActive > 0 && (
            <button
              onClick={clearAll}
              className="text-[10px] text-accent-cyan hover:text-accent-cyan/80 transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Status */}
      <FilterSection
        title="Status"
        collapsed={collapsedSections.has('status')}
        onToggle={() => toggleSection('status')}
        activeCount={filters.statuses.length}
      >
        {STATUS_OPTIONS.map((opt) => (
          <FilterCheckbox
            key={opt.value}
            checked={filters.statuses.includes(opt.value)}
            onChange={() => toggleValue('statuses', opt.value)}
            label={opt.label}
            count={counts.statuses[opt.value] || 0}
            dot={opt.color}
          />
        ))}
      </FilterSection>

      {/* Priority */}
      <FilterSection
        title="Priority"
        collapsed={collapsedSections.has('priority')}
        onToggle={() => toggleSection('priority')}
        activeCount={filters.priorities.length}
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <FilterCheckbox
            key={opt.value}
            checked={filters.priorities.includes(opt.value)}
            onChange={() => toggleValue('priorities', opt.value)}
            label={opt.label}
            count={counts.priorities[opt.value] || 0}
            dot={opt.color}
          />
        ))}
      </FilterSection>

      {/* Assignee */}
      <FilterSection
        title="Assignee"
        collapsed={collapsedSections.has('assignee')}
        onToggle={() => toggleSection('assignee')}
        activeCount={filters.assignees.length}
      >
        <FilterCheckbox
          checked={filters.assignees.includes('unassigned')}
          onChange={() => toggleValue('assignees', 'unassigned')}
          label="Unassigned"
          count={counts.assignees['unassigned'] || 0}
        />
        {members.map((m) => {
          const initials = m.display_name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
          return (
            <FilterCheckbox
              key={m.user_id}
              checked={filters.assignees.includes(m.user_id)}
              onChange={() => toggleValue('assignees', m.user_id)}
              label={m.display_name}
              count={counts.assignees[m.user_id] || 0}
              avatar={{ src: m.avatar_url || undefined, initials }}
            />
          )
        })}
      </FilterSection>

      {/* Phase */}
      <FilterSection
        title="Phase"
        collapsed={collapsedSections.has('phase')}
        onToggle={() => toggleSection('phase')}
        activeCount={filters.phases.length}
      >
        <FilterCheckbox
          checked={filters.phases.includes('unphased')}
          onChange={() => toggleValue('phases', 'unphased')}
          label="Unphased"
          count={counts.phases['unphased'] || 0}
        />
        {phases.map((p) => (
          <FilterCheckbox
            key={p.id}
            checked={filters.phases.includes(p.id)}
            onChange={() => toggleValue('phases', p.id)}
            label={p.name}
            count={counts.phases[p.id] || 0}
          />
        ))}
      </FilterSection>

      {/* Feature */}
      {features.length > 0 && (
        <FilterSection
          title="Feature"
          collapsed={collapsedSections.has('feature')}
          onToggle={() => toggleSection('feature')}
          activeCount={filters.features.length}
        >
          <FilterCheckbox
            checked={filters.features.includes('unlinked')}
            onChange={() => toggleValue('features', 'unlinked')}
            label="No feature linked"
            count={counts.features['unlinked'] || 0}
          />
          {features.map((f) => (
            <FilterCheckbox
              key={f.id}
              checked={filters.features.includes(f.id)}
              onChange={() => toggleValue('features', f.id)}
              label={f.title}
              count={counts.features[f.id] || 0}
            />
          ))}
        </FilterSection>
      )}
    </div>
  )
}

/* ── Section ───────────────────────────────────────────────────── */

function FilterSection({
  title,
  collapsed,
  onToggle,
  activeCount,
  children,
}: {
  title: string
  collapsed: boolean
  onToggle: () => void
  activeCount: number
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border-default last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-tertiary transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-text-tertiary" />
          ) : (
            <ChevronDown className="w-3 h-3 text-text-tertiary" />
          )}
          <span className="text-xs font-medium text-text-primary">{title}</span>
          {activeCount > 0 && (
            <span className="text-[10px] bg-accent-cyan/20 text-accent-cyan rounded-full px-1.5 py-0.5">
              {activeCount}
            </span>
          )}
        </span>
      </button>
      {!collapsed && (
        <div className="px-3 pb-2 space-y-0.5">{children}</div>
      )}
    </div>
  )
}

/* ── Checkbox ──────────────────────────────────────────────────── */

function FilterCheckbox({
  checked,
  onChange,
  label,
  count,
  dot,
  avatar,
}: {
  checked: boolean
  onChange: () => void
  label: string
  count: number
  dot?: string
  avatar?: { src?: string; initials: string }
}) {
  return (
    <label className="flex items-center gap-2 px-1 py-1 rounded hover:bg-bg-tertiary transition-colors cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-3 h-3 rounded border-border-default text-accent-cyan focus:ring-accent-cyan/30 bg-bg-primary flex-shrink-0"
      />
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />}
      {avatar && (
        <Avatar
          src={avatar.src}
          alt={label}
          initials={avatar.initials}
          size="sm"
          className="!w-4 !h-4 !text-[7px] flex-shrink-0"
        />
      )}
      <span className="text-xs text-text-secondary truncate flex-1">{label}</span>
      <span className="text-[10px] text-text-tertiary flex-shrink-0">{count}</span>
    </label>
  )
}

export type { FilterState, FilterCounts }
