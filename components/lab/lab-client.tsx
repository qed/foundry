'use client'

import { useState, useEffect, useCallback } from 'react'
import { LabHeader } from './lab-header'
import { LabInbox } from './lab-inbox'
import { LabDetailPanel } from './lab-detail-panel'
import { LabAgentPanel } from './lab-agent-panel'
import type { FeedbackSubmission } from '@/types/database'

interface LabStats {
  total: number
  newCount: number
  triaged: number
  converted: number
}

interface LabClientProps {
  projectId: string
  initialStats: LabStats
}

export function LabClient({ projectId, initialStats }: LabClientProps) {
  const [feedback, setFeedback] = useState<FeedbackSubmission[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [agentPanelOpen, setAgentPanelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchFeedback = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true)
      else setIsLoading(true)

      const res = await fetch(`/api/projects/${projectId}/feedback`)
      if (!res.ok) throw new Error('Failed to fetch feedback')
      const data = await res.json()
      setFeedback(data.feedback || [])
    } catch (err) {
      console.error('Error loading feedback:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  const stats: LabStats = isLoading
    ? initialStats
    : {
        total: feedback.length,
        newCount: feedback.filter((f) => f.status === 'new').length,
        triaged: feedback.filter((f) => f.status === 'triaged').length,
        converted: feedback.filter((f) => f.status === 'converted').length,
      }

  const selectedFeedback = feedback.find((f) => f.id === selectedId) || null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <LabHeader
        stats={stats}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchFeedback(true)}
        agentPanelOpen={agentPanelOpen}
        onToggleAgent={() => setAgentPanelOpen((prev) => !prev)}
      />

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Inbox (40%) */}
        <div className="w-full md:w-[40%] flex-shrink-0 border-r border-border-default bg-bg-secondary">
          <LabInbox
            feedback={feedback}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isLoading={isLoading}
          />
        </div>

        {/* Right panel: Detail (60%) */}
        <div className="hidden md:flex flex-1 min-w-0 bg-bg-primary">
          <LabDetailPanel feedback={selectedFeedback} />
        </div>
      </div>

      {/* Agent panel overlay */}
      <LabAgentPanel
        open={agentPanelOpen}
        onClose={() => setAgentPanelOpen(false)}
      />

      {/* Overlay backdrop when agent panel open */}
      {agentPanelOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30"
          onClick={() => setAgentPanelOpen(false)}
        />
      )}
    </div>
  )
}
