'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShopHeader, type ShopStats } from './shop-header'
import { ShopLeftPanel } from './shop-left-panel'
import { ShopCenterPanel } from './shop-center-panel'
import { ShopRightPanel } from './shop-right-panel'
import { ShopGettingStarted } from './shop-getting-started'

interface ShopClientProps {
  projectId: string
  orgSlug: string
  initialStats: ShopStats
  hasFeatureNodes: boolean
}

export function ShopClient({
  projectId,
  orgSlug: _orgSlug,
  initialStats,
  hasFeatureNodes,
}: ShopClientProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [stats, setStats] = useState<ShopStats>(initialStats)

  // Auto-collapse right panel on narrow screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1400px)')
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setRightPanelOpen(false)
      }
    }
    handleChange(mq)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  // On very narrow screens, collapse both panels
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)')
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setLeftPanelOpen(false)
        setRightPanelOpen(false)
      }
    }
    handleChange(mq)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  // Refetch stats from API
  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/feature-nodes/stats`)
      if (!res.ok) return
      const data = await res.json()
      setStats({
        epics: data.epicCount,
        features: data.featureCount,
        subFeatures: data.subfeatureCount,
        tasks: data.taskCount,
        completionPercent: data.completionPercent,
        inProgressPercent: data.inProgressPercent,
        blockedNodeCount: data.blockedNodeCount,
        statusBreakdown: data.statusBreakdown,
      })
    } catch {
      // Silently ignore — stats will refresh on next tree change
    }
  }, [projectId])

  return (
    <div className="flex flex-col h-full">
      {/* Shop Header */}
      <ShopHeader
        stats={stats}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onToggleLeftPanel={() => setLeftPanelOpen((prev) => !prev)}
        onToggleRightPanel={() => setRightPanelOpen((prev) => !prev)}
      />

      {/* Getting started banner for empty projects */}
      {!hasFeatureNodes && <ShopGettingStarted />}

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Feature tree */}
        <ShopLeftPanel
          open={leftPanelOpen}
          projectId={projectId}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onTreeChange={refreshStats}
        />

        {/* Center panel: Document editor */}
        <ShopCenterPanel selectedNodeId={selectedNodeId} projectId={projectId} />

        {/* Right panel: Agent chat */}
        <ShopRightPanel open={rightPanelOpen} projectId={projectId} selectedNodeId={selectedNodeId} />
      </div>
    </div>
  )
}
