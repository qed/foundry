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
}

export function IdeaGrid({ ideas, isLoading, onIdeaClick, highlightedIds, newIds }: IdeaGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <IdeaCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ideas.map((idea) => (
        <div key={idea.id} className={cn(newIds?.has(idea.id) && 'animate-slide-in')}>
          <IdeaCard
            idea={idea}
            onClick={() => onIdeaClick?.(idea.id)}
            highlighted={highlightedIds?.has(idea.id)}
          />
        </div>
      ))}
    </div>
  )
}
