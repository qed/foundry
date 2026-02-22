'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HallHeader } from './hall-header'
import { FilterBar } from './filter-bar'
import { IdeaGrid } from './idea-grid'
import { IdeaList } from './idea-list'
import { HallEmptyState } from './hall-empty-state'
import { NoResultsState } from './no-results-state'
import { LoadMoreTrigger } from './load-more-trigger'
import { IdeaCreateModal } from './idea-create-modal'
import { IdeaDetailSlideOver } from './idea-detail-slide-over'
import { DuplicateAlert } from './duplicate-alert'
import type { DuplicateIdea } from './duplicate-alert'
import { AgentPanel } from './agent-panel'
import { ConnectionStatus } from './connection-status'
import { BulkActionBar } from './bulk-action-bar'
import { BulkTagModal } from './bulk-tag-modal'
import { BulkStatusModal } from './bulk-status-modal'
import { BulkDeleteModal } from './bulk-delete-modal'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast-container'
import { useRealtimeIdeas } from '@/lib/realtime/use-realtime-ideas'
import type { IdeaWithDetails, SortOption } from './types'
import type { Tag, Idea, IdeaStatus } from '@/types/database'

const PAGE_SIZE = 12

interface HallClientProps {
  initialIdeas: IdeaWithDetails[]
  initialTotal: number
  initialHasMore: boolean
  projectId: string
  orgSlug: string
  initialTags: Tag[]
}

export function HallClient({
  initialIdeas,
  initialTotal,
  initialHasMore,
  projectId,
  orgSlug,
  initialTags,
}: HallClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // URL state
  const viewMode = (searchParams.get('view') as 'grid' | 'list') || 'grid'
  const searchValue = searchParams.get('search') || ''
  const statusFilter = searchParams.get('status') || null
  const sortBy = (searchParams.get('sort') as SortOption) || 'newest'
  const tagsParam = searchParams.get('tags') || ''
  const selectedTagIds = tagsParam ? tagsParam.split(',').filter(Boolean) : []

  // Data state
  const [ideas, setIdeas] = useState(initialIdeas)
  const [total, setTotal] = useState(initialTotal)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)

  // Project tags
  const [projectTags] = useState(initialTags)

  // Other state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false)
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)
  const [agentOpen, setAgentOpen] = useState(false)
  const [showBulkTagModal, setShowBulkTagModal] = useState(false)
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [duplicateAlert, setDuplicateAlert] = useState<{
    ideaId: string
    title: string
    duplicates: DuplicateIdea[]
  } | null>(null)

  const { addToast } = useToast()

  // Real-time update tracking
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const highlightTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const addHighlight = useCallback((id: string, type: 'new' | 'update') => {
    const setter = type === 'new' ? setNewIds : setHighlightedIds
    setter((prev) => new Set(prev).add(id))

    // Clear existing timer for this id
    const existing = highlightTimers.current.get(id)
    if (existing) clearTimeout(existing)

    // Auto-clear after animation completes
    const timer = setTimeout(() => {
      setter((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      highlightTimers.current.delete(id)
    }, 1000)
    highlightTimers.current.set(id, timer)
  }, [])

  // Real-time subscription
  const handleRealtimeChange = useCallback(
    (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Idea | null; old: Partial<Idea> | null }) => {
      switch (payload.eventType) {
        case 'INSERT': {
          if (!payload.new) return
          // Add to the top of the list with minimal data
          // Real-time payloads don't include joined relations (tags, creator),
          // so we add a stub and let the next refetch fill in details.
          const stub: IdeaWithDetails = {
            ...payload.new,
            tags: [],
            creator: null,
          }
          setIdeas((prev) => {
            if (prev.some((i) => i.id === stub.id)) return prev
            return [stub, ...prev]
          })
          setTotal((prev) => prev + 1)
          addHighlight(stub.id, 'new')
          break
        }
        case 'UPDATE': {
          if (!payload.new) return
          const updated = payload.new
          setIdeas((prev) =>
            prev.map((idea) =>
              idea.id === updated.id
                ? { ...idea, ...updated, tags: idea.tags, creator: idea.creator }
                : idea
            )
          )
          addHighlight(updated.id, 'update')
          break
        }
        case 'DELETE': {
          const deletedId = payload.old?.id
          if (!deletedId) return
          setIdeas((prev) => prev.filter((idea) => idea.id !== deletedId))
          setTotal((prev) => Math.max(0, prev - 1))
          break
        }
      }
    },
    [addHighlight]
  )

  const { isConnected } = useRealtimeIdeas(projectId, handleRealtimeChange)

  // Cleanup highlight timers on unmount
  useEffect(() => {
    const timers = highlightTimers.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  // Debounce search for API calls
  const [debouncedSearch, setDebouncedSearch] = useState(searchValue)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchValue), 300)
    return () => clearTimeout(timer)
  }, [searchValue])

  // Track first render to skip initial fetch when using server data
  const isFirstRender = useRef(true)

  // Fetch from API helper
  const fetchFromApi = useCallback(
    async (offset: number, signal?: AbortSignal) => {
      const params = new URLSearchParams({
        projectId,
        limit: String(PAGE_SIZE),
        offset: String(offset),
        sort: sortBy,
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter) params.set('status', statusFilter)
      if (tagsParam) params.set('tags', tagsParam)

      const res = await fetch(`/api/hall/ideas?${params}`, signal ? { signal } : undefined)
      if (!res.ok) throw new Error('Failed to fetch ideas')
      return res.json() as Promise<{
        ideas: IdeaWithDetails[]
        total: number
        hasMore: boolean
      }>
    },
    [projectId, sortBy, debouncedSearch, statusFilter, tagsParam]
  )

  // Refetch when filters/sort change
  useEffect(() => {
    // On first render with default filters, use server-provided data
    if (isFirstRender.current) {
      isFirstRender.current = false
      if (!debouncedSearch && !statusFilter && !tagsParam && sortBy === 'newest') {
        return
      }
    }

    const controller = new AbortController()

    async function doFetch() {
      setIsRefetching(true)
      try {
        const params = new URLSearchParams({
          projectId,
          limit: String(PAGE_SIZE),
          offset: '0',
          sort: sortBy,
        })
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (statusFilter) params.set('status', statusFilter)
        if (tagsParam) params.set('tags', tagsParam)

        const res = await fetch(`/api/hall/ideas?${params}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        setIdeas(data.ideas)
        setTotal(data.total)
        setHasMore(data.hasMore)
        setSelectedIds(new Set())
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      } finally {
        if (!controller.signal.aborted) setIsRefetching(false)
      }
    }

    doFetch()
    return () => controller.abort()
  }, [debouncedSearch, statusFilter, sortBy, tagsParam, projectId])

  // Load more (append next page)
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    fetchFromApi(ideas.length)
      .then((data) => {
        setIdeas((prev) => [...prev, ...data.ideas])
        setTotal(data.total)
        setHasMore(data.hasMore)
      })
      .catch(() => {})
      .finally(() => setIsLoadingMore(false))
  }, [fetchFromApi, isLoadingMore, hasMore, ideas.length])

  // Detect duplicates for a newly created idea (fire-and-forget)
  const detectDuplicates = useCallback(
    async (ideaId: string, ideaTitle: string, ideaBody: string | null) => {
      try {
        const res = await fetch('/api/agent/hall/detect-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            ideaId,
            ideaTitle,
            ideaBody: ideaBody || '',
          }),
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.duplicates && data.duplicates.length > 0) {
          setDuplicateAlert({ ideaId, title: ideaTitle, duplicates: data.duplicates })
        }
      } catch {
        // Non-blocking — silently ignore
      }
    },
    [projectId]
  )

  // Refetch after creating an idea (reset to page 1 with current filters)
  const handleIdeaCreated = useCallback(
    (idea?: { id: string; title: string; body: string | null }) => {
      setIsRefetching(true)

      fetchFromApi(0)
        .then((data) => {
          setIdeas(data.ideas)
          setTotal(data.total)
          setHasMore(data.hasMore)
        })
        .catch(() => {})
        .finally(() => setIsRefetching(false))

      // Fire-and-forget duplicate detection
      if (idea) {
        detectDuplicates(idea.id, idea.title, idea.body)
      }
    },
    [fetchFromApi, detectDuplicates]
  )

  // Handle idea updated from edit form
  const handleIdeaUpdated = useCallback((updatedIdea: IdeaWithDetails) => {
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === updatedIdea.id ? updatedIdea : idea))
    )
  }, [])

  // Handle idea archived (soft delete)
  const handleIdeaArchived = useCallback(async (ideaId: string) => {
    const res = await fetch(`/api/hall/ideas/${ideaId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      addToast('Failed to archive idea', 'error')
      throw new Error('Failed to archive')
    }

    const { previousStatus } = await res.json()

    // Remove from local list
    setIdeas((prev) => prev.filter((idea) => idea.id !== ideaId))
    setTotal((prev) => prev - 1)

    // Show toast with undo action
    addToast('Idea archived', 'info', 10000, {
      label: 'Undo',
      onClick: async () => {
        try {
          const undoRes = await fetch(`/api/hall/ideas/${ideaId}/undelete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previousStatus }),
          })

          if (!undoRes.ok) {
            addToast('Failed to undo archive', 'error')
            return
          }

          addToast('Idea restored', 'success')

          // Refetch to restore the idea in the list
          fetchFromApi(0)
            .then((data) => {
              setIdeas(data.ideas)
              setTotal(data.total)
              setHasMore(data.hasMore)
            })
            .catch(() => {})
        } catch {
          addToast('Failed to undo archive', 'error')
        }
      },
    })
  }, [addToast, fetchFromApi])

  // Bulk tag handler
  const handleBulkTag = useCallback(
    async (tagIds: string[]) => {
      const ideaIds = Array.from(selectedIds)
      const res = await fetch('/api/hall/bulk/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ideaIds, tagIds }),
      })

      if (!res.ok) {
        addToast('Failed to tag ideas', 'error')
        return
      }

      addToast(`Tagged ${ideaIds.length} ${ideaIds.length === 1 ? 'idea' : 'ideas'}`, 'success')
      setSelectedIds(new Set())

      // Refetch to get updated tag data
      fetchFromApi(0)
        .then((data) => {
          setIdeas(data.ideas)
          setTotal(data.total)
          setHasMore(data.hasMore)
        })
        .catch(() => {})
    },
    [selectedIds, projectId, addToast, fetchFromApi]
  )

  // Bulk status handler
  const handleBulkStatus = useCallback(
    async (status: IdeaStatus) => {
      const ideaIds = Array.from(selectedIds)
      const res = await fetch('/api/hall/bulk/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ideaIds, status }),
      })

      if (!res.ok) {
        addToast('Failed to update status', 'error')
        return
      }

      const { updated } = await res.json()
      addToast(
        `Updated ${updated} ${updated === 1 ? 'idea' : 'ideas'} to ${status}`,
        'success'
      )
      setSelectedIds(new Set())

      // Refetch
      fetchFromApi(0)
        .then((data) => {
          setIdeas(data.ideas)
          setTotal(data.total)
          setHasMore(data.hasMore)
        })
        .catch(() => {})
    },
    [selectedIds, projectId, addToast, fetchFromApi]
  )

  // Bulk archive handler
  const handleBulkArchive = useCallback(async () => {
    const ideaIds = Array.from(selectedIds)
    const res = await fetch('/api/hall/bulk/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ideaIds }),
    })

    if (!res.ok) {
      addToast('Failed to archive ideas', 'error')
      return
    }

    const { archived, previousStatuses } = await res.json()

    // Optimistic removal
    setIdeas((prev) => prev.filter((idea) => !selectedIds.has(idea.id)))
    setTotal((prev) => prev - archived)
    setSelectedIds(new Set())

    // Undo toast
    addToast(`Archived ${archived} ${archived === 1 ? 'idea' : 'ideas'}`, 'info', 10000, {
      label: 'Undo',
      onClick: async () => {
        try {
          const undoRes = await fetch('/api/hall/bulk/unarchive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, previousStatuses }),
          })

          if (!undoRes.ok) {
            addToast('Failed to undo archive', 'error')
            return
          }

          const { restored } = await undoRes.json()
          addToast(`Restored ${restored} ${restored === 1 ? 'idea' : 'ideas'}`, 'success')

          fetchFromApi(0)
            .then((data) => {
              setIdeas(data.ideas)
              setTotal(data.total)
              setHasMore(data.hasMore)
            })
            .catch(() => {})
        } catch {
          addToast('Failed to undo archive', 'error')
        }
      },
    })
  }, [selectedIds, projectId, addToast, fetchFromApi])

  // URL state updater
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      const queryString = params.toString()
      router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, {
        scroll: false,
      })
    },
    [searchParams, router, pathname]
  )

  const hasActiveFilters =
    !!searchValue || !!statusFilter || selectedTagIds.length > 0 || sortBy !== 'newest'
  const showEmptyProject = ideas.length === 0 && !hasActiveFilters && !isRefetching
  const showNoResults = ideas.length === 0 && hasActiveFilters && !isRefetching

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <HallHeader
            searchValue={searchValue}
            onSearchChange={(value) => updateParams({ search: value || null })}
            viewMode={viewMode}
            onViewModeChange={(mode) =>
              updateParams({ view: mode === 'grid' ? null : mode })
            }
            onNewIdeaClick={() => setShowNewIdeaModal(true)}
            tagsHref={`/org/${orgSlug}/project/${projectId}/hall/tags`}
          />
        </div>
        <ConnectionStatus isConnected={isConnected} className="mt-2 shrink-0" />
      </div>

      {(ideas.length > 0 || hasActiveFilters) && (
        <FilterBar
          statusFilter={statusFilter}
          onStatusChange={(status) => updateParams({ status })}
          sortBy={sortBy}
          onSortChange={(sort) =>
            updateParams({ sort: sort === 'newest' ? null : sort })
          }
          selectedTagIds={selectedTagIds}
          onTagsChange={(tagIds) =>
            updateParams({ tags: tagIds.length > 0 ? tagIds.join(',') : null })
          }
          projectTags={projectTags}
          searchValue={searchValue}
          onClearSearch={() => updateParams({ search: null })}
          onClearAll={() =>
            updateParams({ search: null, status: null, sort: null, tags: null })
          }
          hasActiveFilters={hasActiveFilters}
          total={total}
        />
      )}

      {/* Duplicate Detection Alert */}
      {duplicateAlert && (
        <DuplicateAlert
          newIdeaId={duplicateAlert.ideaId}
          newIdeaTitle={duplicateAlert.title}
          duplicates={duplicateAlert.duplicates}
          onDismiss={() => setDuplicateAlert(null)}
          onViewIdea={(ideaId) => {
            setSelectedIdeaId(ideaId)
          }}
          onLinked={() => {
            // Refetch to update connection counts
            fetchFromApi(0)
              .then((data) => {
                setIdeas(data.ideas)
                setTotal(data.total)
                setHasMore(data.hasMore)
              })
              .catch(() => {})
          }}
        />
      )}

      <div className={cn(isRefetching && 'opacity-50 pointer-events-none transition-opacity')}>
        {showEmptyProject ? (
          <HallEmptyState onNewIdeaClick={() => setShowNewIdeaModal(true)} />
        ) : showNoResults ? (
          <NoResultsState
            onClearFilters={() =>
              updateParams({ search: null, status: null, sort: null, tags: null })
            }
          />
        ) : viewMode === 'grid' ? (
          <IdeaGrid
            ideas={ideas}
            orgSlug={orgSlug}
            projectId={projectId}
            onIdeaClick={setSelectedIdeaId}
            highlightedIds={highlightedIds}
            newIds={newIds}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        ) : (
          <IdeaList
            ideas={ideas}
            orgSlug={orgSlug}
            projectId={projectId}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onIdeaClick={setSelectedIdeaId}
            highlightedIds={highlightedIds}
            newIds={newIds}
          />
        )}
      </div>

      {/* Refetching indicator */}
      {isRefetching && (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && !isRefetching && !isLoadingMore && (
        <LoadMoreTrigger onLoadMore={loadMore} isLoading={isLoadingMore} />
      )}

      {/* Loading more spinner */}
      {isLoadingMore && (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      )}

      {/* End of list message */}
      {!hasMore && ideas.length > 0 && !isRefetching && (
        <p className="text-center text-text-tertiary text-sm py-6">
          All {total} {total === 1 ? 'idea' : 'ideas'} loaded
        </p>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onTag={() => setShowBulkTagModal(true)}
        onChangeStatus={() => setShowBulkStatusModal(true)}
        onDelete={() => setShowBulkDeleteModal(true)}
        onDeselect={() => setSelectedIds(new Set())}
      />

      {/* Bulk Modals */}
      <BulkTagModal
        isOpen={showBulkTagModal}
        onClose={() => setShowBulkTagModal(false)}
        projectTags={projectTags}
        selectedCount={selectedIds.size}
        onConfirm={handleBulkTag}
      />
      <BulkStatusModal
        isOpen={showBulkStatusModal}
        onClose={() => setShowBulkStatusModal(false)}
        selectedCount={selectedIds.size}
        onConfirm={handleBulkStatus}
      />
      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        selectedCount={selectedIds.size}
        onConfirm={handleBulkArchive}
      />

      {/* Mobile FAB */}
      <button
        onClick={() => setShowNewIdeaModal(true)}
        className="fixed bottom-20 right-4 md:hidden z-40 w-14 h-14 rounded-full bg-accent-cyan text-bg-primary shadow-lg shadow-accent-cyan/25 flex items-center justify-center hover:bg-accent-cyan/90 active:scale-95 transition-all"
        aria-label="New Idea"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* New Idea Modal */}
      <IdeaCreateModal
        isOpen={showNewIdeaModal}
        onClose={() => setShowNewIdeaModal(false)}
        projectId={projectId}
        onIdeaCreated={handleIdeaCreated}
      />

      {/* Idea Detail Slide-Over */}
      <IdeaDetailSlideOver
        ideaId={selectedIdeaId}
        isOpen={!!selectedIdeaId}
        onClose={() => setSelectedIdeaId(null)}
        onTagClick={(tagId) => {
          const current = selectedTagIds.includes(tagId)
            ? selectedTagIds
            : [...selectedTagIds, tagId]
          updateParams({ tags: current.join(',') })
        }}
        projectId={projectId}
        orgSlug={orgSlug}
        onIdeaUpdated={handleIdeaUpdated}
        onIdeaArchived={handleIdeaArchived}
      />

      {/* Agent toggle button */}
      {!agentOpen && (
        <button
          onClick={() => setAgentOpen(true)}
          className="fixed bottom-20 right-20 md:bottom-6 md:right-6 z-40 w-12 h-12 rounded-full bg-accent-purple text-white shadow-lg shadow-accent-purple/25 flex items-center justify-center hover:bg-accent-purple/90 active:scale-95 transition-all"
          aria-label="Open Hall Agent"
          title="Hall Agent"
        >
          <Bot className="w-5 h-5" />
        </button>
      )}

      {/* Agent Panel */}
      <AgentPanel
        projectId={projectId}
        isOpen={agentOpen}
        onClose={() => setAgentOpen(false)}
      />

      {/* Agent overlay on mobile */}
      {agentOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={() => setAgentOpen(false)}
        />
      )}
    </div>
  )
}
