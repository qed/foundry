'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import type { MemberInfo } from './work-order-table'

interface AssigneeSelectorProps {
  members: MemberInfo[]
  currentAssigneeId: string | null
  onSelect: (assigneeId: string | null) => void
  onClose: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AssigneeSelector({
  members,
  currentAssigneeId,
  onSelect,
  onClose,
}: AssigneeSelectorProps) {
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus search input on open
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const filtered = search.trim()
    ? members.filter((m) =>
        m.display_name.toLowerCase().includes(search.toLowerCase())
      )
    : members

  const handleSelect = useCallback((assigneeId: string | null) => {
    onSelect(assigneeId)
    onClose()
  }, [onSelect, onClose])

  return (
    <div
      ref={ref}
      className="absolute z-30 mt-1 w-56 bg-bg-secondary border border-border-default rounded-lg shadow-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search input (show when 5+ members) */}
      {members.length >= 5 && (
        <div className="p-2 border-b border-border-default">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full px-2 py-1 bg-bg-tertiary border border-border-default rounded text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
          />
        </div>
      )}

      <div className="max-h-48 overflow-y-auto py-1">
        {/* Unassigned option */}
        <button
          onClick={() => handleSelect(null)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
            currentAssigneeId === null
              ? 'text-accent-cyan bg-accent-cyan/5'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          )}
        >
          <X className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-xs">Unassigned</span>
          {currentAssigneeId === null && (
            <span className="ml-auto text-accent-cyan text-xs">&#10003;</span>
          )}
        </button>

        {/* Member list */}
        {filtered.map((member) => (
          <button
            key={member.user_id}
            onClick={() => handleSelect(member.user_id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
              currentAssigneeId === member.user_id
                ? 'text-accent-cyan bg-accent-cyan/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            )}
          >
            <Avatar
              src={member.avatar_url || undefined}
              alt={member.display_name}
              initials={getInitials(member.display_name)}
              size="sm"
              className="!w-5 !h-5 !text-[8px]"
            />
            <span className="text-xs truncate flex-1">{member.display_name}</span>
            {currentAssigneeId === member.user_id && (
              <span className="text-accent-cyan text-xs flex-shrink-0">&#10003;</span>
            )}
          </button>
        ))}

        {filtered.length === 0 && search && (
          <p className="text-xs text-text-tertiary px-3 py-2">No members found</p>
        )}
      </div>
    </div>
  )
}
