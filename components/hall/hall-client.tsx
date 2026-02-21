'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HallHeader } from './hall-header'
import { FilterBar } from './filter-bar'
import { IdeaGrid } from './idea-grid'
import { IdeaList } from './idea-list'
import { HallEmptyState } from './hall-empty-state'
import { NoResultsState } from './no-results-state'
import { LoadMoreTrigger } from './load-more-trigger'
import { IdeaCreateModal } from './idea-create-modal'
import { Spinner } from '@/components/ui/spinner'
import type { IdeaWithDetails, SortOption } from './types'
import type { Tag } from '@/types/database'

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

  // Refetch after creating an idea (reset to page 1 with current filters)
  const handleIdeaCreated = useCallback(() => {
    setIsRefetching(true)

    fetchFromApi(0)
      .then((data) => {
        setIdeas(data.ideas)
        setTotal(data.total)
        setHasMore(data.hasMore)
      })
      .catch(() => {})
      .finally(() => setIsRefetching(false))
  }, [fetchFromApi])

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
      <HallHeader
        searchValue={searchValue}
        onSearchChange={(value) => updateParams({ search: value || null })}
        viewMode={viewMode}
        onViewModeChange={(mode) =>
          updateParams({ view: mode === 'grid' ? null : mode })
        }
        onNewIdeaClick={() => setShowNewIdeaModal(true)}
      />

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
          />
        ) : (
          <IdeaList
            ideas={ideas}
            orgSlug={orgSlug}
            projectId={projectId}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
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
    </div>
  )
}
