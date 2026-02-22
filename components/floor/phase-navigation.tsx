'use client'

import { useRef } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Phase, WorkOrder } from '@/types/database'

interface PhaseNavigationProps {
  phases: Phase[]
  workOrders: WorkOrder[]
  selectedPhaseId: string | null
  onSelectPhase: (phaseId: string | null) => void
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-text-tertiary',
  active: 'bg-accent-cyan',
  completed: 'bg-accent-success',
}

export function PhaseNavigation({
  phases,
  workOrders,
  selectedPhaseId,
  onSelectPhase,
}: PhaseNavigationProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  // Count work orders per phase
  const getPhaseProgress = (phaseId: string) => {
    const phaseWOs = workOrders.filter((wo) => wo.phase_id === phaseId)
    const done = phaseWOs.filter((wo) => wo.status === 'done').length
    return { done, total: phaseWOs.length }
  }

  const allDone = workOrders.filter((wo) => wo.status === 'done').length

  return (
    <div className="h-12 flex items-center border-b border-border-default bg-bg-secondary flex-shrink-0">
      {/* Scroll left */}
      <button
        onClick={() => scrollBy(-1)}
        className="p-1.5 text-text-tertiary hover:text-text-primary flex-shrink-0"
        aria-label="Scroll phases left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Scrollable tabs */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide px-1"
      >
        {/* All Phases tab */}
        <button
          onClick={() => onSelectPhase(null)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0',
            selectedPhaseId === null
              ? 'bg-accent-cyan/10 text-accent-cyan'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          )}
        >
          All Phases
          <span className="text-[10px] text-text-tertiary">
            {allDone}/{workOrders.length}
          </span>
        </button>

        {phases.map((phase) => {
          const progress = getPhaseProgress(phase.id)
          return (
            <button
              key={phase.id}
              onClick={() => onSelectPhase(phase.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0',
                selectedPhaseId === phase.id
                  ? 'bg-accent-cyan/10 text-accent-cyan'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  STATUS_COLORS[phase.status] || 'bg-text-tertiary'
                )}
              />
              {phase.name}
              <span className="text-[10px] text-text-tertiary">
                {progress.done}/{progress.total}
              </span>
            </button>
          )
        })}

        {/* Add phase placeholder */}
        <button
          disabled
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-text-tertiary opacity-50 cursor-not-allowed flex-shrink-0"
          title="Add phase (Phase 069)"
        >
          <Plus className="w-3 h-3" />
          Phase
        </button>
      </div>

      {/* Scroll right */}
      <button
        onClick={() => scrollBy(1)}
        className="p-1.5 text-text-tertiary hover:text-text-primary flex-shrink-0"
        aria-label="Scroll phases right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
