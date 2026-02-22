'use client'

import { useEffect, useRef } from 'react'
import { Eye, Pencil, FolderInput, Trash2, Download } from 'lucide-react'

interface ArtifactContextMenuProps {
  x: number
  y: number
  onPreview: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
  onDownload: () => void
  onClose: () => void
}

const MENU_ITEMS = [
  { action: 'preview' as const, label: 'Preview', icon: Eye },
  { action: 'download' as const, label: 'Download', icon: Download },
  { action: 'rename' as const, label: 'Rename', icon: Pencil },
  { action: 'move' as const, label: 'Move to...', icon: FolderInput },
  { action: 'delete' as const, label: 'Delete', icon: Trash2, danger: true },
]

export function ArtifactContextMenu({
  x,
  y,
  onPreview,
  onRename,
  onMove,
  onDelete,
  onDownload,
  onClose,
}: ArtifactContextMenuProps) {
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

  // Keep menu within viewport
  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    if (rect.right > vw) {
      menuRef.current.style.left = `${x - rect.width}px`
    }
    if (rect.bottom > vh) {
      menuRef.current.style.top = `${y - rect.height}px`
    }
  }, [x, y])

  const handlers: Record<string, () => void> = {
    preview: onPreview,
    download: onDownload,
    rename: onRename,
    move: onMove,
    delete: onDelete,
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] bg-bg-secondary border border-border-default rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {MENU_ITEMS.map((item) => (
        <div key={item.action}>
          {item.danger && (
            <div className="my-1 border-t border-border-default" />
          )}
          <button
            onClick={() => {
              handlers[item.action]()
              onClose()
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
              item.danger
                ? 'text-accent-error hover:bg-accent-error/10'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        </div>
      ))}
    </div>
  )
}
