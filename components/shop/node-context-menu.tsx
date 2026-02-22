'use client'

import { useEffect, useRef } from 'react'
import { Plus, GitBranch, Pencil, Trash2, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContextMenuPosition {
  x: number
  y: number
}

interface NodeContextMenuProps {
  position: ContextMenuPosition
  canAddChild: boolean
  onAddChild: () => void
  onAddSibling: () => void
  onClose: () => void
}

export function NodeContextMenu({
  position,
  canAddChild,
  onAddChild,
  onAddSibling,
  onClose,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Adjust position so menu doesn't overflow viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 100,
  }

  return (
    <div
      ref={menuRef}
      className="bg-bg-secondary border border-border-default rounded-lg shadow-xl py-1 min-w-[160px]"
      style={style}
    >
      <button
        onClick={() => { onAddChild(); onClose() }}
        disabled={!canAddChild}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors',
          canAddChild
            ? 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            : 'text-text-tertiary cursor-not-allowed'
        )}
      >
        <Plus className="w-3.5 h-3.5" />
        Add Child
      </button>
      <button
        onClick={() => { onAddSibling(); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary hover:text-text-primary text-left transition-colors"
      >
        <GitBranch className="w-3.5 h-3.5" />
        Add Sibling
      </button>

      <div className="border-t border-border-default my-1" />

      {/* Phase 031 placeholders */}
      <button
        disabled
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-tertiary cursor-not-allowed text-left"
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit
      </button>
      <button
        disabled
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-tertiary cursor-not-allowed text-left"
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
        Change Level
      </button>

      <div className="border-t border-border-default my-1" />

      <button
        disabled
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-tertiary cursor-not-allowed text-left"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  )
}
