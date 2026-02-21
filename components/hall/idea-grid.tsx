'use client'

import { IdeaCard, IdeaCardSkeleton } from './idea-card'
import type { IdeaWithDetails } from './types'

interface IdeaGridProps {
  ideas: IdeaWithDetails[]
  orgSlug: string
  projectId: string
  isLoading?: boolean
}

export function IdeaGrid({ ideas, isLoading }: IdeaGridProps) {
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
          onClick={() => {
            // Detail view will be wired in a future phase
          }}
        />
      ))}
    </div>
  )
}
