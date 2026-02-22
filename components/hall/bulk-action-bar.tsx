'use client'

import { Tags, RefreshCw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BulkActionBarProps {
  selectedCount: number
  onTag: () => void
  onChangeStatus: () => void
  onDelete: () => void
  onDeselect: () => void
}

export function BulkActionBar({
  selectedCount,
  onTag,
  onChangeStatus,
  onDelete,
  onDeselect,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl glass-panel border border-accent-cyan/20 shadow-lg shadow-black/40 animate-slide-in">
      <span className="text-sm font-medium text-text-primary whitespace-nowrap">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent-cyan text-bg-primary text-xs font-bold mr-1.5">
          {selectedCount}
        </span>
        selected
      </span>

      <div className="w-px h-6 bg-border-default mx-1" />

      <Button variant="ghost" size="sm" onClick={onTag} className="gap-1.5">
        <Tags className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Tag</span>
      </Button>

      <Button variant="ghost" size="sm" onClick={onChangeStatus} className="gap-1.5">
        <RefreshCw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Status</span>
      </Button>

      <Button variant="danger" size="sm" onClick={onDelete} className="gap-1.5">
        <Trash2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Archive</span>
      </Button>

      <div className="w-px h-6 bg-border-default mx-1" />

      <button
        onClick={onDeselect}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        aria-label="Deselect all"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
