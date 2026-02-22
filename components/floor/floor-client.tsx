'use client'

import { useState, useEffect, useCallback } from 'react'
import { FloorHeader } from './floor-header'
import { PhaseNavigation } from './phase-navigation'
import { FloorContent } from './floor-content'
import { FloorRightPanel } from './floor-right-panel'
import { Spinner } from '@/components/ui/spinner'
import type { Phase, WorkOrder } from '@/types/database'

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
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
        const [phasesRes, workOrdersRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/phases`),
          fetch(`/api/projects/${projectId}/work-orders`),
        ])

        if (!phasesRes.ok || !workOrdersRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const phasesData = await phasesRes.json()
        const workOrdersData = await workOrdersRes.json()

        if (!cancelled) {
          setPhases(phasesData.phases || [])
          setWorkOrders(workOrdersData.workOrders || [])
        }
      } catch (err) {
        console.error('Error loading floor data:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [projectId])

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
            selectedPhaseId={selectedPhaseId}
          />
        )}

        {/* Right panel: Agent chat */}
        <FloorRightPanel open={rightPanelOpen} />
      </div>
    </div>
  )
}
