'use client'

import { cn, timeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { STATUS_CONFIG, type IdeaWithDetails } from './types'
import type { IdeaStatus } from '@/types/database'

interface IdeaListProps {
  ideas: IdeaWithDetails[]
  orgSlug: string
  projectId: string
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  isLoading?: boolean
}

export function IdeaList({
  ideas,
  selectedIds,
  onSelectionChange,
  isLoading,
}: IdeaListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <IdeaListRowSkeleton key={i} />
        ))}
      </div>
    )
  }

  const allSelected = ideas.length > 0 && ideas.every((i) => selectedIds.has(i.id))

  function toggleAll() {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(ideas.map((i) => i.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-text-tertiary uppercase tracking-wider border-b border-border-default">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-3.5 h-3.5 rounded border-border-default accent-accent-cyan"
          />
        </label>
        <span className="flex-1 min-w-0">Title</span>
        <span className="w-20 hidden sm:block">Status</span>
        <span className="w-24 hidden md:block">Tags</span>
        <span className="w-20 hidden lg:block">Creator</span>
        <span className="w-20 text-right">Updated</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border-default/50">
        {ideas.map((idea) => (
          <IdeaListRow
            key={idea.id}
            idea={idea}
            isSelected={selectedIds.has(idea.id)}
            onToggle={() => toggleOne(idea.id)}
          />
        ))}
      </div>
    </div>
  )
}

function IdeaListRow({
  idea,
  isSelected,
  onToggle,
}: {
  idea: IdeaWithDetails
  isSelected: boolean
  onToggle: () => void
}) {
  const statusCfg = STATUS_CONFIG[idea.status as IdeaStatus]
  const creatorInitials = idea.creator?.display_name
    ? idea.creator.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-3 transition-colors hover:bg-bg-tertiary/50 cursor-pointer group',
        isSelected && 'bg-accent-cyan/5'
      )}
    >
      <label className="flex items-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-3.5 h-3.5 rounded border-border-default accent-accent-cyan"
        />
      </label>

      {/* Title */}
      <span className="flex-1 min-w-0 text-sm text-text-primary truncate font-medium">
        {idea.title}
      </span>

      {/* Status */}
      <span className="w-20 hidden sm:block">
        <Badge variant={statusCfg.variant} className="text-[10px]">
          {statusCfg.label}
        </Badge>
      </span>

      {/* Tags */}
      <span className="w-24 hidden md:flex gap-1 overflow-hidden">
        {idea.tags.slice(0, 2).map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium truncate"
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
            }}
          >
            {tag.name}
          </span>
        ))}
        {idea.tags.length > 2 && (
          <span className="text-[10px] text-text-tertiary">+{idea.tags.length - 2}</span>
        )}
      </span>

      {/* Creator */}
      <span className="w-20 hidden lg:flex items-center gap-1.5">
        <Avatar
          src={idea.creator?.avatar_url || undefined}
          alt={idea.creator?.display_name || 'User'}
          initials={creatorInitials}
          size="sm"
          className="!w-5 !h-5 !text-[8px]"
        />
        <span className="text-[11px] text-text-tertiary truncate">
          {idea.creator?.display_name || 'Unknown'}
        </span>
      </span>

      {/* Timestamp */}
      <span className="w-20 text-right text-[11px] text-text-tertiary">
        {timeAgo(idea.updated_at)}
      </span>
    </div>
  )
}

function IdeaListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 animate-pulse">
      <div className="w-3.5 h-3.5 bg-bg-tertiary rounded" />
      <div className="flex-1 h-4 bg-bg-tertiary rounded" />
      <div className="w-16 h-4 bg-bg-tertiary rounded-full hidden sm:block" />
      <div className="w-20 h-4 bg-bg-tertiary rounded hidden md:block" />
      <div className="w-16 h-4 bg-bg-tertiary rounded hidden lg:block" />
      <div className="w-16 h-3 bg-bg-tertiary rounded ml-auto" />
    </div>
  )
}
