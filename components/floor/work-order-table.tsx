'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import type { WorkOrder, Phase } from '@/types/database'

export interface MemberInfo {
  user_id: string
  display_name: string
  avatar_url: string | null
}

export interface FeatureInfo {
  id: string
  title: string
}

type SortField = 'title' | 'status' | 'priority' | 'assignee' | 'phase' | 'feature' | 'updated'
type SortDir = 'asc' | 'desc' | null
type GroupBy = 'none' | 'status' | 'phase' | 'assignee' | 'priority'

interface WorkOrderTableProps {
  workOrders: WorkOrder[]
  phases: Phase[]
  members: MemberInfo[]
  features: FeatureInfo[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onWorkOrderClick?: (workOrderId: string) => void
}

const STATUS_ORDER = ['backlog', 'ready', 'in_progress', 'in_review', 'done']
const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low']

const STATUS_STYLES: Record<string, string> = {
  backlog: 'bg-text-tertiary/10 text-text-tertiary',
  ready: 'bg-text-secondary/10 text-text-secondary',
  in_progress: 'bg-accent-cyan/10 text-accent-cyan',
  in_review: 'bg-accent-purple/10 text-accent-purple',
  done: 'bg-accent-success/10 text-accent-success',
}

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-accent-error',
  high: 'bg-accent-warning',
  medium: 'bg-accent-cyan',
  low: 'bg-text-tertiary',
}

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'No grouping' },
  { value: 'status', label: 'Status' },
  { value: 'phase', label: 'Phase' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'priority', label: 'Priority' },
]

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export function WorkOrderTable({
  workOrders,
  phases,
  members,
  features,
  selectedIds,
  onSelectionChange,
  onWorkOrderClick,
}: WorkOrderTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Lookup maps
  const phaseMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of phases) m.set(p.id, p.name)
    return m
  }, [phases])

  const memberMap = useMemo(() => {
    const m = new Map<string, MemberInfo>()
    for (const mem of members) m.set(mem.user_id, mem)
    return m
  }, [members])

  const featureMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const f of features) m.set(f.id, f.title)
    return m
  }, [features])

  // Sort handler
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') { setSortField(null); setSortDir(null) }
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }, [sortField, sortDir])

  // Get sort value for a work order
  const getSortValue = useCallback((wo: WorkOrder, field: SortField): string | number => {
    switch (field) {
      case 'title': return wo.title.toLowerCase()
      case 'status': return STATUS_ORDER.indexOf(wo.status)
      case 'priority': return PRIORITY_ORDER.indexOf(wo.priority)
      case 'assignee': return memberMap.get(wo.assignee_id || '')?.display_name?.toLowerCase() || 'zzz'
      case 'phase': return phaseMap.get(wo.phase_id || '')?.toLowerCase() || 'zzz'
      case 'feature': return featureMap.get(wo.feature_node_id || '')?.toLowerCase() || 'zzz'
      case 'updated': return new Date(wo.updated_at).getTime()
    }
  }, [memberMap, phaseMap, featureMap])

  // Sort work orders
  const sorted = useMemo(() => {
    const arr = [...workOrders]
    if (sortField && sortDir) {
      arr.sort((a, b) => {
        const va = getSortValue(a, sortField)
        const vb = getSortValue(b, sortField)
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return arr
  }, [workOrders, sortField, sortDir, getSortValue])

  // Group work orders
  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: '__all__', label: '', items: sorted }]

    const groupMap = new Map<string, WorkOrder[]>()
    const keyOrder: string[] = []

    for (const wo of sorted) {
      let key: string
      switch (groupBy) {
        case 'status': key = wo.status; break
        case 'priority': key = wo.priority; break
        case 'phase': key = wo.phase_id || '__unphased__'; break
        case 'assignee': key = wo.assignee_id || '__unassigned__'; break
      }
      if (!groupMap.has(key)) {
        groupMap.set(key, [])
        keyOrder.push(key)
      }
      groupMap.get(key)!.push(wo)
    }

    // Sort group keys by natural order
    if (groupBy === 'status') keyOrder.sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b))
    if (groupBy === 'priority') keyOrder.sort((a, b) => PRIORITY_ORDER.indexOf(a) - PRIORITY_ORDER.indexOf(b))

    return keyOrder.map((key) => {
      let label: string
      switch (groupBy) {
        case 'status': label = STATUS_LABELS[key] || key; break
        case 'priority': label = key.charAt(0).toUpperCase() + key.slice(1); break
        case 'phase': label = key === '__unphased__' ? 'Unphased' : (phaseMap.get(key) || 'Unknown Phase'); break
        case 'assignee': label = key === '__unassigned__' ? 'Unassigned' : (memberMap.get(key)?.display_name || 'Unknown'); break
      }
      return { key, label, items: groupMap.get(key)! }
    })
  }, [sorted, groupBy, phaseMap, memberMap])

  // Selection
  const allVisibleIds = useMemo(() => {
    const ids = new Set<string>()
    for (const g of groups) {
      if (!collapsedGroups.has(g.key)) {
        for (const wo of g.items) ids.add(wo.id)
      }
    }
    return ids
  }, [groups, collapsedGroups])

  const allSelected = allVisibleIds.size > 0 && [...allVisibleIds].every((id) => selectedIds.has(id))

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(allVisibleIds))
    }
  }, [allSelected, allVisibleIds, onSelectionChange])

  const handleSelectRow = useCallback((id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }, [selectedIds, onSelectionChange])

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  if (workOrders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <List className="w-10 h-10 text-text-tertiary/40 mx-auto mb-3" />
          <p className="text-sm text-text-tertiary">No work orders yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Grouping controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-default bg-bg-secondary flex-shrink-0">
        <span className="text-xs text-text-tertiary">Group by:</span>
        {GROUP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setGroupBy(opt.value); setCollapsedGroups(new Set()) }}
            className={cn(
              'text-xs px-2 py-1 rounded transition-colors',
              groupBy === opt.value
                ? 'bg-accent-cyan/15 text-accent-cyan font-medium'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            )}
          >
            {opt.label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-text-tertiary">
          {workOrders.length} work order{workOrders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-bg-secondary">
            <tr className="border-b border-border-default">
              {/* Checkbox */}
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="accent-accent-cyan cursor-pointer"
                  aria-label="Select all"
                />
              </th>
              <SortHeader field="title" label="Title" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="min-w-[200px]" />
              <SortHeader field="status" label="Status" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-[120px]" />
              <SortHeader field="priority" label="Priority" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-[110px]" />
              <SortHeader field="assignee" label="Assignee" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-[160px]" />
              <SortHeader field="phase" label="Phase" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-[130px] hidden lg:table-cell" />
              <SortHeader field="feature" label="Feature" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-[160px] hidden xl:table-cell" />
              <SortHeader field="updated" label="Updated" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-[120px]" />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.key)
              return (
                <GroupRows
                  key={group.key}
                  groupKey={group.key}
                  label={group.label}
                  items={group.items}
                  isGrouped={groupBy !== 'none'}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleGroup(group.key)}
                  selectedIds={selectedIds}
                  onSelectRow={handleSelectRow}
                  onWorkOrderClick={onWorkOrderClick}
                  phaseMap={phaseMap}
                  memberMap={memberMap}
                  featureMap={featureMap}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
  className,
}: {
  field: SortField
  label: string
  sortField: SortField | null
  sortDir: SortDir
  onSort: (field: SortField) => void
  className?: string
}) {
  const isActive = sortField === field
  return (
    <th
      onClick={() => onSort(field)}
      className={cn(
        'text-left text-xs font-medium text-text-tertiary uppercase tracking-wide px-3 py-2 cursor-pointer select-none hover:text-text-secondary transition-colors',
        className
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && sortDir === 'asc' && <ArrowUp className="w-3 h-3 text-accent-cyan" />}
        {isActive && sortDir === 'desc' && <ArrowDown className="w-3 h-3 text-accent-cyan" />}
        {!isActive && <ChevronsUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  )
}

function GroupRows({
  groupKey: _groupKey,
  label,
  items,
  isGrouped,
  isCollapsed,
  onToggle,
  selectedIds,
  onSelectRow,
  onWorkOrderClick,
  phaseMap,
  memberMap,
  featureMap,
}: {
  groupKey: string
  label: string
  items: WorkOrder[]
  isGrouped: boolean
  isCollapsed: boolean
  onToggle: () => void
  selectedIds: Set<string>
  onSelectRow: (id: string) => void
  onWorkOrderClick?: (id: string) => void
  phaseMap: Map<string, string>
  memberMap: Map<string, MemberInfo>
  featureMap: Map<string, string>
}) {
  return (
    <>
      {isGrouped && (
        <tr
          onClick={onToggle}
          className="bg-bg-tertiary/50 border-b border-border-default cursor-pointer hover:bg-bg-tertiary transition-colors"
        >
          <td colSpan={8} className="px-3 py-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-text-primary">
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
              )}
              {label}
              <span className="text-text-tertiary font-normal">({items.length})</span>
            </span>
          </td>
        </tr>
      )}
      {!isCollapsed &&
        items.map((wo) => {
          const member = wo.assignee_id ? memberMap.get(wo.assignee_id) : null
          const phaseName = wo.phase_id ? phaseMap.get(wo.phase_id) : null
          const featureName = wo.feature_node_id ? featureMap.get(wo.feature_node_id) : null
          const isSelected = selectedIds.has(wo.id)

          return (
            <tr
              key={wo.id}
              className={cn(
                'border-b border-border-default/50 hover:bg-bg-tertiary/30 transition-colors cursor-pointer',
                isSelected && 'bg-accent-cyan/5'
              )}
              onClick={() => onWorkOrderClick?.(wo.id)}
            >
              <td className="w-10 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectRow(wo.id)}
                  className="accent-accent-cyan cursor-pointer"
                  aria-label={`Select ${wo.title}`}
                />
              </td>
              <td className="px-3 py-2.5 text-sm text-text-primary truncate max-w-[300px]">
                {wo.title}
              </td>
              <td className="px-3 py-2.5">
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', STATUS_STYLES[wo.status] || '')}>
                  {STATUS_LABELS[wo.status] || wo.status}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_COLORS[wo.priority] || 'bg-text-tertiary')} />
                  <span className="text-xs text-text-secondary capitalize">{wo.priority}</span>
                </span>
              </td>
              <td className="px-3 py-2.5">
                {member ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar
                      src={member.avatar_url || undefined}
                      alt={member.display_name}
                      initials={getInitials(member.display_name)}
                      size="sm"
                    />
                    <span className="text-xs text-text-secondary truncate">{member.display_name}</span>
                  </span>
                ) : (
                  <span className="text-xs text-text-tertiary">Unassigned</span>
                )}
              </td>
              <td className="px-3 py-2.5 hidden lg:table-cell">
                <span className="text-xs text-text-secondary truncate">
                  {phaseName || <span className="text-text-tertiary">Unphased</span>}
                </span>
              </td>
              <td className="px-3 py-2.5 hidden xl:table-cell">
                <span className="text-xs text-text-secondary truncate">
                  {featureName || <span className="text-text-tertiary">No feature</span>}
                </span>
              </td>
              <td className="px-3 py-2.5 text-xs text-text-tertiary" title={new Date(wo.updated_at).toLocaleString()}>
                {timeAgo(wo.updated_at)}
              </td>
            </tr>
          )
        })}
    </>
  )
}
