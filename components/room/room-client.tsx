'use client'

import { useState, useEffect } from 'react'
import { RoomHeader } from './room-header'
import { RoomLeftPanel } from './room-left-panel'
import { RoomCenterPanel } from './room-center-panel'
import { RoomRightPanel } from './room-right-panel'
import { Spinner } from '@/components/ui/spinner'
import type { Blueprint } from '@/types/database'

interface RoomStats {
  foundations: number
  systemDiagrams: number
  featureBlueprints: number
  completionPercent: number
}

interface RoomClientProps {
  projectId: string
  initialStats: RoomStats
}

export function RoomClient({ projectId, initialStats }: RoomClientProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null)
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch blueprints
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/projects/${projectId}/blueprints`)
        if (!res.ok) throw new Error('Failed to fetch blueprints')
        const data = await res.json()
        if (!cancelled) {
          setBlueprints(data.blueprints || [])
        }
      } catch (err) {
        console.error('Error loading blueprints:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [projectId])

  // Auto-collapse right panel on narrow screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1280px)')
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
    const mq = window.matchMedia('(max-width: 768px)')
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

  const selectedBlueprint = blueprints.find((bp) => bp.id === selectedBlueprintId) || null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <RoomHeader
        stats={initialStats}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onToggleLeftPanel={() => setLeftPanelOpen((prev) => !prev)}
        onToggleRightPanel={() => setRightPanelOpen((prev) => !prev)}
      />

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Blueprint navigation */}
        {isLoading ? (
          <div
            className={leftPanelOpen ? 'w-[280px] flex-shrink-0 border-r border-border-default bg-bg-secondary flex items-center justify-center' : 'w-0 overflow-hidden'}
          >
            <Spinner size="md" />
          </div>
        ) : (
          <RoomLeftPanel
            open={leftPanelOpen}
            blueprints={blueprints}
            selectedBlueprintId={selectedBlueprintId}
            onSelectBlueprint={setSelectedBlueprintId}
          />
        )}

        {/* Center panel: Blueprint editor */}
        <RoomCenterPanel projectId={projectId} blueprint={selectedBlueprint} />

        {/* Right panel: Agent chat */}
        <RoomRightPanel open={rightPanelOpen} />
      </div>
    </div>
  )
}
