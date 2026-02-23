'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { FloorHeader } from './floor-header'
import { PhaseNavigation } from './phase-navigation'
import { FloorContent } from './floor-content'
import { FloorRightPanel } from './floor-right-panel'
import { CreateWorkOrderModal } from './create-work-order-modal'
import { ExtractWorkOrdersModal } from './extract-work-orders-modal'
import { SuggestPhasePlanModal } from './suggest-phase-plan-modal'
import { WorkOrderDetail } from './work-order-detail'
import { FilterPanel } from './filter-panel'
import { FilterBadges } from './filter-badges'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/auth/context'
import type { Phase, WorkOrder, WorkOrderStatus, WorkOrderPriority, PhaseStatus } from '@/types/database'
import type { MemberInfo, FeatureInfo } from './work-order-table'
import type { FilterState, FilterCounts } from './filter-panel'

interface FloorStats {
  totalWorkOrders: number
  doneWorkOrders: number
}

interface FloorClientProps {
  projectId: string
  initialStats: FloorStats
}

export function FloorClient({ projectId, initialStats }: FloorClientProps) {
  const { user } = useAuth()
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [extractModalOpen, setExtractModalOpen] = useState(false)
  const [suggestPhasesModalOpen, setSuggestPhasesModalOpen] = useState(false)
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null)
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
  const [myWorkOrdersFilter, setMyWorkOrdersFilter] = useState(false)
  const [phases, setPhases] = useState<Phase[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [features, setFeatures] = useState<FeatureInfo[]>([])
  const [tableSelectedIds, setTableSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [fetchKey, setFetchKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    statuses: [],
    priorities: [],
    assignees: [],
    phases: [],
    features: [],
  })

  // Restore view and phase from localStorage/URL
  useEffect(() => {
    const saved = localStorage.getItem('floor-view')
    if (saved === 'kanban' || saved === 'table') {
      setView(saved)
    }

    // Also check URL
    const url = new URL(window.location.href)
    const urlView = url.searchParams.get('view')
    if (urlView === 'kanban' || urlView === 'table') {
      setView(urlView)
    }

    // Restore phase from URL
    const urlPhase = url.searchParams.get('phase')
    if (urlPhase) {
      setSelectedPhaseId(urlPhase)
    }

    // Restore "My Work Orders" filter from URL
    if (url.searchParams.get('filter') === 'my-work-orders') {
      setMyWorkOrdersFilter(true)
    }

    // Restore search from URL
    const urlSearch = url.searchParams.get('search')
    if (urlSearch) {
      setSearchQuery(urlSearch)
      setDebouncedSearch(urlSearch)
    }

    // Restore filters from URL
    const parseCSV = (key: string) => {
      const val = url.searchParams.get(key)
      return val ? val.split(',').filter(Boolean) : []
    }
    const restoredFilters: FilterState = {
      statuses: parseCSV('status') as WorkOrderStatus[],
      priorities: parseCSV('priority') as WorkOrderPriority[],
      assignees: parseCSV('assignee'),
      phases: parseCSV('phases'),
      features: parseCSV('feature'),
    }
    const hasFilters = Object.values(restoredFilters).some((arr) => arr.length > 0)
    if (hasFilters) {
      setFilters(restoredFilters)
    }
  }, [])

  // Persist view to localStorage + URL
  const handleViewChange = useCallback((newView: 'kanban' | 'table') => {
    setView(newView)
    localStorage.setItem('floor-view', newView)
    const url = new URL(window.location.href)
    url.searchParams.set('view', newView)
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Persist phase selection to URL
  const handleSelectPhase = useCallback((phaseId: string | null) => {
    setSelectedPhaseId(phaseId)
    const url = new URL(window.location.href)
    if (phaseId) {
      url.searchParams.set('phase', phaseId)
    } else {
      url.searchParams.delete('phase')
    }
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Persist search to URL
  useEffect(() => {
    const url = new URL(window.location.href)
    if (debouncedSearch) {
      url.searchParams.set('search', debouncedSearch)
    } else {
      url.searchParams.delete('search')
    }
    window.history.replaceState({}, '', url.toString())
  }, [debouncedSearch])

  // Persist filters to URL
  const handleFiltersChange = useCallback((next: FilterState) => {
    setFilters(next)
    const url = new URL(window.location.href)
    const setOrDelete = (key: string, arr: string[]) => {
      if (arr.length > 0) {
        url.searchParams.set(key, arr.join(','))
      } else {
        url.searchParams.delete(key)
      }
    }
    setOrDelete('status', next.statuses)
    setOrDelete('priority', next.priorities)
    setOrDelete('assignee', next.assignees)
    setOrDelete('phases', next.phases)
    setOrDelete('feature', next.features)
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Fetch phases and work orders
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        const [phasesRes, workOrdersRes, membersRes, treeRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/phases`),
          fetch(`/api/projects/${projectId}/work-orders`),
          fetch(`/api/projects/${projectId}/members`),
          fetch(`/api/projects/${projectId}/feature-tree`),
        ])

        if (!phasesRes.ok || !workOrdersRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const phasesData = await phasesRes.json()
        const workOrdersData = await workOrdersRes.json()

        // Parse members (may fail if endpoint doesn't exist yet)
        let memberList: MemberInfo[] = []
        if (membersRes.ok) {
          const membersData = await membersRes.json()
          memberList = (membersData.members || []).map((m: { user_id: string; display_name: string; avatar_url: string | null }) => ({
            user_id: m.user_id,
            display_name: m.display_name,
            avatar_url: m.avatar_url,
          }))
        }

        // Parse feature tree into flat list
        let featureList: FeatureInfo[] = []
        if (treeRes.ok) {
          const treeData = await treeRes.json()
          const flattenNodes = (nodes: { id: string; title: string; children: unknown[] }[]): FeatureInfo[] => {
            const result: FeatureInfo[] = []
            for (const n of nodes) {
              result.push({ id: n.id, title: n.title })
              if (Array.isArray(n.children)) {
                result.push(...flattenNodes(n.children as { id: string; title: string; children: unknown[] }[]))
              }
            }
            return result
          }
          featureList = flattenNodes(treeData.nodes || [])
        }

        if (!cancelled) {
          setPhases(phasesData.phases || [])
          setWorkOrders(workOrdersData.workOrders || [])
          setMembers(memberList)
          setFeatures(featureList)
        }
      } catch (err) {
        console.error('Error loading floor data:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [projectId, fetchKey])

  // Auto-collapse right panel on narrow screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1200px)')
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setRightPanelOpen(false)
      }
    }
    handleChange(mq)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  const doneCount = workOrders.filter((wo) => wo.status === 'done').length

  // "My Work Orders" filter
  const handleToggleMyWorkOrders = useCallback(() => {
    setMyWorkOrdersFilter((prev) => {
      const next = !prev
      const url = new URL(window.location.href)
      if (next) {
        url.searchParams.set('filter', 'my-work-orders')
      } else {
        url.searchParams.delete('filter')
      }
      window.history.replaceState({}, '', url.toString())
      return next
    })
  }, [])

  // Apply all filters: "My Work Orders" + search + filter panel
  const filteredWorkOrders = useMemo(() => {
    let result = workOrders

    // My Work Orders filter
    if (myWorkOrdersFilter && user) {
      result = result.filter((wo) => wo.assignee_id === user.id)
    }

    // Text search (debounced)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (wo) =>
          wo.title.toLowerCase().includes(q) ||
          (wo.description && wo.description.toLowerCase().includes(q)) ||
          (wo.acceptance_criteria && wo.acceptance_criteria.toLowerCase().includes(q))
      )
    }

    // Status filter
    if (filters.statuses.length > 0) {
      result = result.filter((wo) => filters.statuses.includes(wo.status))
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      result = result.filter((wo) => filters.priorities.includes(wo.priority))
    }

    // Assignee filter
    if (filters.assignees.length > 0) {
      result = result.filter((wo) => {
        if (!wo.assignee_id) return filters.assignees.includes('unassigned')
        return filters.assignees.includes(wo.assignee_id)
      })
    }

    // Phase filter
    if (filters.phases.length > 0) {
      result = result.filter((wo) => {
        if (!wo.phase_id) return filters.phases.includes('unphased')
        return filters.phases.includes(wo.phase_id)
      })
    }

    // Feature filter
    if (filters.features.length > 0) {
      result = result.filter((wo) => {
        if (!wo.feature_node_id) return filters.features.includes('unlinked')
        return filters.features.includes(wo.feature_node_id)
      })
    }

    return result
  }, [workOrders, myWorkOrdersFilter, user, debouncedSearch, filters])

  const myWorkOrdersCount = useMemo(() => {
    if (!user) return 0
    return workOrders.filter((wo) => wo.assignee_id === user.id).length
  }, [workOrders, user])

  // Filter counts — computed from all work orders so users see totals
  const filterCounts: FilterCounts = useMemo(() => {
    const c: FilterCounts = {
      statuses: {},
      priorities: {},
      assignees: {},
      phases: {},
      features: {},
    }
    for (const wo of workOrders) {
      c.statuses[wo.status] = (c.statuses[wo.status] || 0) + 1
      c.priorities[wo.priority] = (c.priorities[wo.priority] || 0) + 1
      const aKey = wo.assignee_id || 'unassigned'
      c.assignees[aKey] = (c.assignees[aKey] || 0) + 1
      const pKey = wo.phase_id || 'unphased'
      c.phases[pKey] = (c.phases[pKey] || 0) + 1
      const fKey = wo.feature_node_id || 'unlinked'
      c.features[fKey] = (c.features[fKey] || 0) + 1
    }
    return c
  }, [workOrders])

  const activeFilterCount = useMemo(
    () =>
      filters.statuses.length +
      filters.priorities.length +
      filters.assignees.length +
      filters.phases.length +
      filters.features.length,
    [filters]
  )

  const handleRemoveFilter = useCallback(
    (key: keyof FilterState, value: string) => {
      const next = { ...filters, [key]: (filters[key] as string[]).filter((v) => v !== value) }
      handleFiltersChange(next)
    },
    [filters, handleFiltersChange]
  )

  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('')
    setDebouncedSearch('')
    handleFiltersChange({
      statuses: [],
      priorities: [],
      assignees: [],
      phases: [],
      features: [],
    })
  }, [handleFiltersChange])

  // Feature progress rollup: done/total for each feature that has linked work orders
  const featureProgress = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>()
    for (const wo of workOrders) {
      if (!wo.feature_node_id) continue
      const entry = map.get(wo.feature_node_id) || { done: 0, total: 0 }
      entry.total++
      if (wo.status === 'done') entry.done++
      map.set(wo.feature_node_id, entry)
    }
    return map
  }, [workOrders])

  // Handle assignment change from inline selectors
  const handleAssignmentChange = useCallback(async (workOrderId: string, assigneeId: string | null) => {
    // Optimistic update
    setWorkOrders((prev) =>
      prev.map((wo) => (wo.id === workOrderId ? { ...wo, assignee_id: assigneeId } : wo))
    )

    try {
      const res = await fetch(`/api/projects/${projectId}/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_id: assigneeId }),
      })

      if (!res.ok) {
        setFetchKey((k) => k + 1)
      }
    } catch {
      setFetchKey((k) => k + 1)
    }
  }, [projectId])

  // Handle priority change from inline selectors
  const handlePriorityChange = useCallback(async (workOrderId: string, priority: WorkOrderPriority) => {
    // Optimistic update
    setWorkOrders((prev) =>
      prev.map((wo) => (wo.id === workOrderId ? { ...wo, priority } : wo))
    )

    try {
      const res = await fetch(`/api/projects/${projectId}/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      })

      if (!res.ok) {
        setFetchKey((k) => k + 1)
      }
    } catch {
      setFetchKey((k) => k + 1)
    }
  }, [projectId])

  // Handle reorder from kanban drag-and-drop
  const handleReorder = useCallback(async (items: { id: string; position: number }[]) => {
    // Optimistic update
    const posMap = new Map(items.map((i) => [i.id, i.position]))
    setWorkOrders((prev) =>
      prev.map((wo) => {
        const newPos = posMap.get(wo.id)
        return newPos !== undefined ? { ...wo, position: newPos } : wo
      })
    )

    try {
      const res = await fetch(`/api/projects/${projectId}/work-orders/reorder-batch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })

      if (!res.ok) {
        setFetchKey((k) => k + 1)
      }
    } catch {
      setFetchKey((k) => k + 1)
    }
  }, [projectId])

  // Phase CRUD operations
  const handleCreatePhase = useCallback(async (name: string, description: string | null) => {
    const res = await fetch(`/api/projects/${projectId}/phases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    if (!res.ok) throw new Error('Failed to create phase')
    setFetchKey((k) => k + 1)
  }, [projectId])

  const handleRenamePhase = useCallback(async (phaseId: string, name: string) => {
    // Optimistic update
    setPhases((prev) => prev.map((p) => (p.id === phaseId ? { ...p, name } : p)))
    const res = await fetch(`/api/projects/${projectId}/phases/${phaseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) setFetchKey((k) => k + 1)
  }, [projectId])

  const handleDeletePhase = useCallback(async (phaseId: string) => {
    const res = await fetch(`/api/projects/${projectId}/phases/${phaseId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete phase')
    setFetchKey((k) => k + 1)
  }, [projectId])

  const handleChangePhaseStatus = useCallback(async (phaseId: string, status: PhaseStatus) => {
    // Optimistic update
    setPhases((prev) => prev.map((p) => (p.id === phaseId ? { ...p, status } : p)))
    const res = await fetch(`/api/projects/${projectId}/phases/${phaseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) setFetchKey((k) => k + 1)
  }, [projectId])

  // Handle drag-and-drop status change from kanban
  const handleStatusChange = useCallback(async (workOrderId: string, newStatus: WorkOrderStatus) => {
    // Optimistic update in local state
    setWorkOrders((prev) =>
      prev.map((wo) => (wo.id === workOrderId ? { ...wo, status: newStatus } : wo))
    )

    try {
      const res = await fetch(`/api/projects/${projectId}/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        // Revert on failure — refetch
        setFetchKey((k) => k + 1)
      }
    } catch {
      // Revert on error — refetch
      setFetchKey((k) => k + 1)
    }
  }, [projectId])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <FloorHeader
        totalWorkOrders={isLoading ? initialStats.totalWorkOrders : workOrders.length}
        doneWorkOrders={isLoading ? initialStats.doneWorkOrders : doneCount}
        view={view}
        onViewChange={handleViewChange}
        rightPanelOpen={rightPanelOpen}
        onToggleRightPanel={() => setRightPanelOpen((prev) => !prev)}
        onNewWorkOrder={() => setCreateModalOpen(true)}
        myWorkOrdersActive={myWorkOrdersFilter}
        onToggleMyWorkOrders={handleToggleMyWorkOrders}
        myWorkOrdersCount={myWorkOrdersCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilterCount={activeFilterCount}
        filterPanelOpen={filterPanelOpen}
        onToggleFilterPanel={() => setFilterPanelOpen((prev) => !prev)}
        onExtractFromBlueprints={() => setExtractModalOpen(true)}
        onSuggestPhases={() => setSuggestPhasesModalOpen(true)}
      />

      {/* Filter panel popover — positioned relative to header */}
      {filterPanelOpen && (
        <div className="relative flex-shrink-0">
          <FilterPanel
            filters={filters}
            counts={filterCounts}
            members={members}
            phases={phases.map((p) => ({ id: p.id, name: p.name }))}
            features={features}
            onFiltersChange={handleFiltersChange}
            onClose={() => setFilterPanelOpen(false)}
          />
        </div>
      )}

      {/* Active filter badges */}
      <FilterBadges
        filters={filters}
        search={debouncedSearch}
        members={members}
        phases={phases.map((p) => ({ id: p.id, name: p.name }))}
        features={features}
        onRemoveFilter={handleRemoveFilter}
        onClearSearch={() => { setSearchQuery(''); setDebouncedSearch('') }}
        onClearAll={handleClearAllFilters}
      />

      {/* Phase navigation */}
      <PhaseNavigation
        phases={phases}
        workOrders={workOrders}
        selectedPhaseId={selectedPhaseId}
        onSelectPhase={handleSelectPhase}
        onCreatePhase={handleCreatePhase}
        onRenamePhase={handleRenamePhase}
        onDeletePhase={handleDeletePhase}
        onChangePhaseStatus={handleChangePhaseStatus}
      />

      {/* Main content + agent panel */}
      <div className="flex flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <FloorContent
            view={view}
            workOrders={filteredWorkOrders}
            phases={phases}
            members={members}
            features={features}
            selectedPhaseId={selectedPhaseId}
            selectedIds={tableSelectedIds}
            onSelectionChange={setTableSelectedIds}
            onWorkOrderClick={(id) => setSelectedWorkOrderId(id)}
            onStatusChange={handleStatusChange}
            onAssignmentChange={handleAssignmentChange}
            onPriorityChange={handlePriorityChange}
            onReorder={handleReorder}
            featureProgress={featureProgress}
          />
        )}

        {/* Right panel: Agent chat */}
        <FloorRightPanel open={rightPanelOpen} projectId={projectId} />
      </div>

      {/* Create Work Order Modal */}
      <CreateWorkOrderModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        projectId={projectId}
        phases={phases}
        onCreated={() => setFetchKey((k) => k + 1)}
      />

      {/* Extract Work Orders from Blueprints Modal */}
      <ExtractWorkOrdersModal
        open={extractModalOpen}
        onOpenChange={setExtractModalOpen}
        projectId={projectId}
        onCreated={() => setFetchKey((k) => k + 1)}
      />

      {/* Suggest Phase Plan Modal */}
      <SuggestPhasePlanModal
        open={suggestPhasesModalOpen}
        onOpenChange={setSuggestPhasesModalOpen}
        projectId={projectId}
        workOrders={workOrders}
        onApplied={() => setFetchKey((k) => k + 1)}
      />

      {/* Work Order Detail Slide-Over */}
      <WorkOrderDetail
        workOrderId={selectedWorkOrderId}
        open={selectedWorkOrderId !== null}
        onClose={() => setSelectedWorkOrderId(null)}
        projectId={projectId}
        phases={phases}
        onWorkOrderUpdated={() => setFetchKey((k) => k + 1)}
      />
    </div>
  )
}
