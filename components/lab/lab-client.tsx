'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LabHeader } from './lab-header'
import { LabInbox } from './lab-inbox'
import type { FeedbackSort } from './lab-inbox'
import { LabDetailPanel } from './lab-detail-panel'
import { LabAgentPanel } from './lab-agent-panel'
import { FeedbackFilterBar } from './feedback-filter-bar'
import type { FeedbackFilters } from './feedback-filter-bar'
import { BulkActionsBar } from './bulk-actions-bar'
import { ConversionSuggestionsPanel } from './conversion-suggestions-panel'
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

function parseFiltersFromURL(searchParams: URLSearchParams): FeedbackFilters {
  return {
    search: searchParams.get('search') || '',
    categories: searchParams.get('category')?.split(',').filter(Boolean) || [],
    statuses: searchParams.get('status')?.split(',').filter(Boolean) || [],
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    scoreMin: parseInt(searchParams.get('scoreMin') || '0', 10) || 0,
    scoreMax: parseInt(searchParams.get('scoreMax') || '100', 10) || 100,
  }
}

function filtersToURLParams(filters: FeedbackFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.categories.length) params.set('category', filters.categories.join(','))
  if (filters.statuses.length) params.set('status', filters.statuses.join(','))
  if (filters.tags.length) params.set('tags', filters.tags.join(','))
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.scoreMin > 0) params.set('scoreMin', String(filters.scoreMin))
  if (filters.scoreMax < 100) params.set('scoreMax', String(filters.scoreMax))
  return params
}

function countActiveFilters(f: FeedbackFilters): number {
  let count = 0
  if (f.search) count++
  if (f.categories.length) count++
  if (f.statuses.length) count++
  if (f.tags.length) count++
  if (f.dateFrom || f.dateTo) count++
  if (f.scoreMin > 0 || f.scoreMax < 100) count++
  return count
}

export function LabClient({ projectId, initialStats }: LabClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [feedback, setFeedback] = useState<FeedbackSubmission[]>([])
  const [total, setTotal] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [agentPanelOpen, setAgentPanelOpen] = useState(false)
  const [suggestionsActive, setSuggestionsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sort, setSort] = useState<FeedbackSort>('newest')
  const [page, setPage] = useState(1)

  // Initialize filters from URL on mount
  const [filters, setFilters] = useState<FeedbackFilters>(() =>
    parseFiltersFromURL(searchParams)
  )

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

  // Update URL when filters change — also clear selection
  const handleFiltersChange = useCallback((newFilters: FeedbackFilters) => {
    setFilters(newFilters)
    setPage(1)
    setSelectedIds(new Set())

    const params = filtersToURLParams(newFilters)
    const queryString = params.toString()
    router.replace(queryString ? `?${queryString}` : '?', { scroll: false })
  }, [router])

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

      // Add filter params
      if (filters.search) params.set('search', filters.search)
      if (filters.categories.length) params.set('category', filters.categories.join(','))
      if (filters.statuses.length) params.set('status', filters.statuses.join(','))
      if (filters.tags.length) params.set('tags', filters.tags.join(','))
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.scoreMin > 0) params.set('scoreMin', String(filters.scoreMin))
      if (filters.scoreMax < 100) params.set('scoreMax', String(filters.scoreMax))

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
  }, [projectId, sort, page, filters])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  // Clear selection on sort change
  const handleSortChange = useCallback((newSort: FeedbackSort) => {
    setSort(newSort)
    setPage(1)
    setSelectedIds(new Set())
  }, [])

  // Clear selection on page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    setSelectedIds(new Set())
  }, [])

  const handleFeedbackUpdate = useCallback((updated: FeedbackSubmission) => {
    setFeedback((prev) =>
      prev.map((f) => (f.id === updated.id ? updated : f))
    )
  }, [])

  // Multi-select handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === feedback.length && feedback.length > 0) {
        return new Set()
      }
      return new Set(feedback.map((f) => f.id))
    })
  }, [feedback])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkActionComplete = useCallback(() => {
    setSelectedIds(new Set())
    fetchFeedback(true)
  }, [fetchFeedback])

  // Keyboard shortcuts for selection
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        handleToggleAll()
      }

      if (e.key === 'Escape' && selectedIds.size > 0) {
        handleClearSelection()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleToggleAll, handleClearSelection, selectedIds.size])

  const stats: LabStats = isLoading
    ? initialStats
    : {
        total: total,
        newCount: feedback.filter((f) => f.status === 'new').length,
        triaged: feedback.filter((f) => f.status === 'triaged').length,
        converted: feedback.filter((f) => f.status === 'converted').length,
      }

  const selectedFeedback = feedback.find((f) => f.id === selectedId) || null

  const handleSelectFeedback = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id) setSuggestionsActive(false)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <LabHeader
        stats={stats}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchFeedback(true)}
        agentPanelOpen={agentPanelOpen}
        onToggleAgent={() => setAgentPanelOpen((prev) => !prev)}
        suggestionsActive={suggestionsActive}
        onToggleSuggestions={() => setSuggestionsActive((prev) => !prev)}
      />

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Filters + Inbox (40%) */}
        <div className="w-full md:w-[40%] flex-shrink-0 border-r border-border-default bg-bg-secondary flex flex-col">
          {/* Filter bar */}
          <FeedbackFilterBar
            projectId={projectId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            activeFilterCount={activeFilterCount}
          />

          {/* Inbox */}
          <div className="flex-1 overflow-hidden">
            <LabInbox
              feedback={feedback}
              selectedId={selectedId}
              onSelect={handleSelectFeedback}
              isLoading={isLoading}
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
              sort={sort}
              onSortChange={handleSortChange}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleAll={handleToggleAll}
            />
          </div>
        </div>

        {/* Right panel: Detail or Suggestions (60%) */}
        <div className="hidden md:flex flex-1 min-w-0 bg-bg-primary">
          {suggestionsActive ? (
            <ConversionSuggestionsPanel projectId={projectId} />
          ) : (
            <LabDetailPanel
              feedback={selectedFeedback}
              projectId={projectId}
              onUpdate={handleFeedbackUpdate}
            />
          )}
        </div>
      </div>

      {/* Bulk actions bar — shown when items are selected */}
      {selectedIds.size > 0 && (
        <BulkActionsBar
          projectId={projectId}
          selectedIds={Array.from(selectedIds)}
          onClear={handleClearSelection}
          onActionComplete={handleBulkActionComplete}
        />
      )}

      {/* Agent panel overlay */}
      <LabAgentPanel
        projectId={projectId}
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
