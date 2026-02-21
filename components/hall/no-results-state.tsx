'use client'

import { SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

interface NoResultsStateProps {
  onClearFilters: () => void
}

export function NoResultsState({ onClearFilters }: NoResultsStateProps) {
  return (
    <EmptyState
      icon={<SearchX className="w-12 h-12" />}
      title="No ideas match your filters"
      description="Try adjusting your search or filters to find what you're looking for."
      action={
        <Button variant="secondary" onClick={onClearFilters}>
          Clear filters
        </Button>
      }
      className="py-24"
    />
  )
}
