'use client'

import { Lightbulb } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

interface HallEmptyStateProps {
  onNewIdeaClick: () => void
}

export function HallEmptyState({ onNewIdeaClick }: HallEmptyStateProps) {
  return (
    <EmptyState
      icon={<Lightbulb className="w-12 h-12" />}
      title="The Hall is empty"
      description="Start capturing ideas! Click 'New Idea' to add your first one."
      action={
        <Button onClick={onNewIdeaClick}>
          + New Idea
        </Button>
      }
      className="py-24"
    />
  )
}
