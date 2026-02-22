'use client'

import { useEffect, useRef } from 'react'
import { Pencil, Trash2, FolderPlus, FolderInput } from 'lucide-react'

interface FolderContextMenuProps {
  x: number
  y: number
  depth: number
  onRename: () => void
  onDelete: () => void
  onCreateSubfolder?: () => void
  onMove?: () => void
  onClose: () => void
}

export function FolderContextMenu({
  x,
  y,
  depth,
  onRename,
  onDelete,
  onCreateSubfolder,
  onMove,
  onClose,
}: FolderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Viewport-aware positioning
  const style: React.CSSProperties = { position: 'fixed', zIndex: 60 }
  const menuWidth = 180
  const menuHeight = 160

  if (x + menuWidth > window.innerWidth) {
    style.right = `${window.innerWidth - x}px`
  } else {
    style.left = `${x}px`
  }

  if (y + menuHeight > window.innerHeight) {
    style.bottom = `${window.innerHeight - y}px`
  } else {
    style.top = `${y}px`
  }

  const canCreateSubfolder = depth < 3

  return (
    <div
      ref={menuRef}
      style={style}
      className="w-[180px] bg-bg-secondary border border-border-default rounded-lg shadow-xl py-1 overflow-hidden"
    >
      <button
        onClick={() => { onRename(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        Rename
      </button>
      {canCreateSubfolder && onCreateSubfolder && (
        <button
          onClick={() => { onCreateSubfolder(); onClose() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          New Subfolder
        </button>
      )}
      {onMove && (
        <button
          onClick={() => { onMove(); onClose() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
        >
          <FolderInput className="w-3.5 h-3.5" />
          Move
        </button>
      )}
      <div className="my-1 border-t border-border-default" />
      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-accent-error hover:bg-accent-error/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  )
}
