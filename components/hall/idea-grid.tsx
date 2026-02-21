'use client'

import { IdeaCard, IdeaCardSkeleton } from './idea-card'
import type { IdeaWithDetails } from './types'

interface IdeaGridProps {
  ideas: IdeaWithDetails[]
  orgSlug: string
  projectId: string
  isLoading?: boolean
  onIdeaClick?: (ideaId: string) => void
}

export function IdeaGrid({ ideas, isLoading, onIdeaClick }: IdeaGridProps) {
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
        <IdeaCard
          key={idea.id}
          idea={idea}
          onClick={() => onIdeaClick?.(idea.id)}
        />
      ))}
    </div>
  )
}
