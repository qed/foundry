'use client'

import { useState, useEffect, useCallback } from 'react'
import { FloorHeader } from './floor-header'
import { PhaseNavigation } from './phase-navigation'
import { FloorContent } from './floor-content'
import { FloorRightPanel } from './floor-right-panel'
import { CreateWorkOrderModal } from './create-work-order-modal'
import { WorkOrderDetail } from './work-order-detail'
import { Spinner } from '@/components/ui/spinner'
import type { Phase, WorkOrder, WorkOrderStatus } from '@/types/database'
import type { MemberInfo, FeatureInfo } from './work-order-table'

interface FloorStats {
  totalWorkOrders: number
  doneWorkOrders: number
}

interface FloorClientProps {
  projectId: string
  initialStats: FloorStats
}

export function FloorClient({ projectId, initialStats }: FloorClientProps) {
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null)
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [features, setFeatures] = useState<FeatureInfo[]>([])
  const [tableSelectedIds, setTableSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [fetchKey, setFetchKey] = useState(0)

  // Restore view from localStorage
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
  }, [])

  // Persist view to localStorage + URL
  const handleViewChange = useCallback((newView: 'kanban' | 'table') => {
    setView(newView)
    localStorage.setItem('floor-view', newView)
    const url = new URL(window.location.href)
    url.searchParams.set('view', newView)
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
      />

      {/* Phase navigation */}
      <PhaseNavigation
        phases={phases}
        workOrders={workOrders}
        selectedPhaseId={selectedPhaseId}
        onSelectPhase={setSelectedPhaseId}
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
            workOrders={workOrders}
            phases={phases}
            members={members}
            features={features}
            selectedPhaseId={selectedPhaseId}
            selectedIds={tableSelectedIds}
            onSelectionChange={setTableSelectedIds}
            onWorkOrderClick={(id) => setSelectedWorkOrderId(id)}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Right panel: Agent chat */}
        <FloorRightPanel open={rightPanelOpen} />
      </div>

      {/* Create Work Order Modal */}
      <CreateWorkOrderModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        projectId={projectId}
        phases={phases}
        onCreated={() => setFetchKey((k) => k + 1)}
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
