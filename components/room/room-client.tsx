'use client'

import { useState, useEffect, useCallback } from 'react'
import { RoomHeader } from './room-header'
import { RoomLeftPanel } from './room-left-panel'
import type { FeatureTreeNode } from './room-left-panel'
import { RoomCenterPanel } from './room-center-panel'
import { RoomRightPanel } from './room-right-panel'
import { Spinner } from '@/components/ui/spinner'
import type { Blueprint, BlueprintStatus } from '@/types/database'

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
  const [featureNodes, setFeatureNodes] = useState<FeatureTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchKey, setFetchKey] = useState(0)

  // Fetch blueprints and feature tree
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        const [bpRes, treeRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/blueprints`),
          fetch(`/api/projects/${projectId}/feature-tree`),
        ])

        if (!bpRes.ok) throw new Error('Failed to fetch blueprints')

        const bpData = await bpRes.json()

        let nodes: FeatureTreeNode[] = []
        if (treeRes.ok) {
          const treeData = await treeRes.json()
          nodes = treeData.nodes || []
        }

        if (!cancelled) {
          setBlueprints(bpData.blueprints || [])
          setFeatureNodes(nodes)
        }
      } catch (err) {
        console.error('Error loading room data:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [projectId, fetchKey])

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

  // Create feature blueprint
  const handleCreateFeatureBlueprint = useCallback(async (featureNodeId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/blueprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprint_type: 'feature',
          feature_node_id: featureNodeId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // If blueprint already exists, select it
        if (res.status === 409 && data.existingId) {
          setSelectedBlueprintId(data.existingId)
          return
        }
        throw new Error(data.error || 'Failed to create blueprint')
      }

      const data = await res.json()
      // Add new blueprint to local state and select it
      setBlueprints((prev) => [data.blueprint, ...prev])
      setSelectedBlueprintId(data.blueprint.id)
    } catch (err) {
      console.error('Error creating feature blueprint:', err)
    }
  }, [projectId])

  // Update blueprint status
  const handleStatusChange = useCallback(async (blueprintId: string, status: BlueprintStatus) => {
    // Optimistic update
    setBlueprints((prev) =>
      prev.map((bp) => (bp.id === blueprintId ? { ...bp, status } : bp))
    )

    try {
      const res = await fetch(`/api/projects/${projectId}/blueprints/${blueprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        // Revert on failure
        setFetchKey((k) => k + 1)
      }
    } catch {
      setFetchKey((k) => k + 1)
    }
  }, [projectId])

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
            featureNodes={featureNodes}
            selectedBlueprintId={selectedBlueprintId}
            onSelectBlueprint={setSelectedBlueprintId}
            onCreateFeatureBlueprint={handleCreateFeatureBlueprint}
          />
        )}

        {/* Center panel: Blueprint editor */}
        <RoomCenterPanel
          projectId={projectId}
          blueprint={selectedBlueprint}
          onStatusChange={handleStatusChange}
        />

        {/* Right panel: Agent chat */}
        <RoomRightPanel open={rightPanelOpen} projectId={projectId} selectedBlueprintId={selectedBlueprintId} />
      </div>
    </div>
  )
}
