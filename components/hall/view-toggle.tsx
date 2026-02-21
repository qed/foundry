'use client'

import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ViewToggleProps {
  activeView: 'grid' | 'list'
  onChange: (view: 'grid' | 'list') => void
}

export function ViewToggle({ activeView, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-border-default overflow-hidden">
      <button
        onClick={() => onChange('grid')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
          activeView === 'grid'
            ? 'bg-accent-cyan/15 text-accent-cyan'
            : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
        )}
        aria-label="Grid view"
        aria-pressed={activeView === 'grid'}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        onClick={() => onChange('list')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-border-default',
          activeView === 'list'
            ? 'bg-accent-cyan/15 text-accent-cyan'
            : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
        )}
        aria-label="List view"
        aria-pressed={activeView === 'list'}
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  )
}
