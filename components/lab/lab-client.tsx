'use client'

import { useState, useEffect, useCallback } from 'react'
import { LabHeader } from './lab-header'
import { LabInbox } from './lab-inbox'
import type { FeedbackSort } from './lab-inbox'
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

const PAGE_SIZE = 20

export function LabClient({ projectId, initialStats }: LabClientProps) {
  const [feedback, setFeedback] = useState<FeedbackSubmission[]>([])
  const [total, setTotal] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [agentPanelOpen, setAgentPanelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sort, setSort] = useState<FeedbackSort>('newest')
  const [page, setPage] = useState(1)

  const fetchFeedback = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true)
      else setIsLoading(true)

      const offset = (page - 1) * PAGE_SIZE
      const params = new URLSearchParams({
        sort,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })

      const res = await fetch(`/api/projects/${projectId}/feedback?${params}`)
      if (!res.ok) throw new Error('Failed to fetch feedback')
      const data = await res.json()
      setFeedback(data.feedback || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Error loading feedback:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [projectId, sort, page])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  const handleSortChange = useCallback((newSort: FeedbackSort) => {
    setSort(newSort)
    setPage(1)
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const stats: LabStats = isLoading
    ? initialStats
    : {
        total: total,
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
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            sort={sort}
            onSortChange={handleSortChange}
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
