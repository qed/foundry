'use client'

import { cn } from '@/lib/utils'
import { IdeaCard, IdeaCardSkeleton } from './idea-card'
import type { IdeaWithDetails } from './types'

interface IdeaGridProps {
  ideas: IdeaWithDetails[]
  orgSlug: string
  projectId: string
  isLoading?: boolean
  onIdeaClick?: (ideaId: string) => void
  highlightedIds?: Set<string>
  newIds?: Set<string>
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

export function IdeaGrid({
  ideas,
  isLoading,
  onIdeaClick,
  highlightedIds,
  newIds,
  selectedIds,
  onSelectionChange,
}: IdeaGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <IdeaCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  function handleSelect(id: string) {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ideas.map((idea) => (
        <div key={idea.id} className={cn(newIds?.has(idea.id) && 'animate-slide-in')}>
          <IdeaCard
            idea={idea}
            onClick={() => onIdeaClick?.(idea.id)}
            highlighted={highlightedIds?.has(idea.id)}
            isSelected={selectedIds?.has(idea.id)}
            onSelect={onSelectionChange ? handleSelect : undefined}
          />
        </div>
      ))}
    </div>
  )
}
