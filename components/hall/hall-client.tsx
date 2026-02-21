'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { Plus, Lightbulb } from 'lucide-react'
import { HallHeader } from './hall-header'
import { FilterBar } from './filter-bar'
import { IdeaGrid } from './idea-grid'
import { IdeaList } from './idea-list'
import { HallEmptyState } from './hall-empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogClose,
} from '@/components/ui/dialog'
import type { IdeaWithDetails, SortOption } from './types'

interface HallClientProps {
  ideas: IdeaWithDetails[]
  projectId: string
  orgSlug: string
}

export function HallClient({ ideas, projectId, orgSlug }: HallClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Read URL state
  const viewMode = (searchParams.get('view') as 'grid' | 'list') || 'grid'
  const searchValue = searchParams.get('search') || ''
  const statusFilter = searchParams.get('status') || null
  const sortBy = (searchParams.get('sort') as SortOption) || 'newest'

  // Local state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false)

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

  // Filtered and sorted ideas
  const filteredIdeas = useMemo(() => {
    let result = [...ideas]

    // Search filter
    if (searchValue) {
      const query = searchValue.toLowerCase()
      result = result.filter(
        (idea) =>
          idea.title.toLowerCase().includes(query) ||
          (idea.body && idea.body.toLowerCase().includes(query))
      )
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((idea) => idea.status === statusFilter)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        case 'updated':
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
        case 'newest':
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
      }
    })

    return result
  }, [ideas, searchValue, statusFilter, sortBy])

  const hasAnyIdeas = ideas.length > 0
  const hasFilteredIdeas = filteredIdeas.length > 0

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

      {hasAnyIdeas && (
        <FilterBar
          statusFilter={statusFilter}
          onStatusChange={(status) => updateParams({ status })}
          sortBy={sortBy}
          onSortChange={(sort) =>
            updateParams({ sort: sort === 'newest' ? null : sort })
          }
          onClearAll={() =>
            updateParams({ search: null, status: null, sort: null })
          }
          hasActiveFilters={
            !!searchValue || !!statusFilter || sortBy !== 'newest'
          }
        />
      )}

      {!hasAnyIdeas ? (
        <HallEmptyState onNewIdeaClick={() => setShowNewIdeaModal(true)} />
      ) : !hasFilteredIdeas ? (
        <div className="text-center py-16">
          <p className="text-text-secondary">No ideas match your filters.</p>
          <button
            onClick={() =>
              updateParams({ search: null, status: null, sort: null })
            }
            className="text-accent-cyan hover:underline mt-2 text-sm"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <IdeaGrid ideas={filteredIdeas} orgSlug={orgSlug} projectId={projectId} />
      ) : (
        <IdeaList
          ideas={filteredIdeas}
          orgSlug={orgSlug}
          projectId={projectId}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => setShowNewIdeaModal(true)}
        className="fixed bottom-20 right-4 md:hidden z-40 w-14 h-14 rounded-full bg-accent-cyan text-bg-primary shadow-lg shadow-accent-cyan/25 flex items-center justify-center hover:bg-accent-cyan/90 active:scale-95 transition-all"
        aria-label="New Idea"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* New Idea Modal Placeholder */}
      <Dialog
        open={showNewIdeaModal}
        onOpenChange={setShowNewIdeaModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Idea</DialogTitle>
            <DialogClose onClick={() => setShowNewIdeaModal(false)} />
          </DialogHeader>
          <DialogBody>
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-accent-cyan mx-auto mb-4" />
              <p className="text-text-primary font-medium mb-2">
                Idea creation coming soon
              </p>
              <p className="text-text-tertiary text-sm">
                The idea capture form will be available in the next phase.
              </p>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}
