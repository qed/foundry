'use client'

import { useState, useEffect } from 'react'
import { ShopHeader } from './shop-header'
import { ShopLeftPanel } from './shop-left-panel'
import { ShopCenterPanel } from './shop-center-panel'
import { ShopRightPanel } from './shop-right-panel'
import { ShopGettingStarted } from './shop-getting-started'

interface ShopStats {
  epics: number
  features: number
  subFeatures: number
  tasks: number
  completionPercent: number
}

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

  return (
    <div className="flex flex-col h-full">
      {/* Shop Header */}
      <ShopHeader
        stats={initialStats}
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
        />

        {/* Center panel: Document editor */}
        <ShopCenterPanel selectedNodeId={selectedNodeId} />

        {/* Right panel: Agent chat */}
        <ShopRightPanel open={rightPanelOpen} />
      </div>
    </div>
  )
}
