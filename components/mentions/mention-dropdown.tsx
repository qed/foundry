'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { User, FileText, ClipboardList, Paperclip, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MentionMatch, MentionType } from '@/lib/mentions/types'
import { MENTION_TYPE_LABELS } from '@/lib/mentions/types'

interface MentionDropdownProps {
  matches: MentionMatch[]
  selectedIndex: number
  position: { top: number; left: number }
  onSelect: (match: MentionMatch) => void
  onDismiss: () => void
  isLoading?: boolean
}

const TYPE_ICONS: Record<MentionType, typeof User> = {
  user: User,
  requirement_doc: FileText,
  blueprint: BookOpen,
  work_order: ClipboardList,
  artifact: Paperclip,
}

export function MentionDropdown({
  matches,
  selectedIndex,
  position,
  onSelect,
  onDismiss,
  isLoading,
}: MentionDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onDismiss()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onDismiss])

  // Group matches by type
  const groups = new Map<MentionType, MentionMatch[]>()
  for (const m of matches) {
    const existing = groups.get(m.type) || []
    existing.push(m)
    groups.set(m.type, existing)
  }

  let globalIndex = 0

  return (
    <div
      ref={listRef}
      className="absolute z-50 w-64 max-h-56 overflow-y-auto rounded-lg border border-border-default bg-bg-secondary shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {isLoading ? (
        <div className="px-3 py-2 text-xs text-text-tertiary">Searching...</div>
      ) : matches.length === 0 ? (
        <div className="px-3 py-2 text-xs text-text-tertiary">No matches found</div>
      ) : (
        Array.from(groups.entries()).map(([type, items]) => (
          <div key={type}>
            <div className="px-2 py-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
              {MENTION_TYPE_LABELS[type]}
            </div>
            {items.map((match) => {
              const idx = globalIndex++
              const Icon = TYPE_ICONS[match.type]
              return (
                <button
                  key={`${match.type}-${match.id}`}
                  ref={idx === selectedIndex ? selectedRef : undefined}
                  onClick={() => onSelect(match)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors',
                    idx === selectedIndex
                      ? 'bg-accent-cyan/10 text-text-primary'
                      : 'text-text-secondary hover:bg-bg-tertiary'
                  )}
                >
                  {match.type === 'user' && match.avatar ? (
                    <Image
                      src={match.avatar}
                      alt=""
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-bg-tertiary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3 h-3 text-text-tertiary" />
                    </div>
                  )}
                  <span className="truncate">{match.display}</span>
                </button>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
