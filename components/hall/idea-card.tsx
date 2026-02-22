'use client'

import { cn, timeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { STATUS_CONFIG, type IdeaWithDetails } from './types'
import type { IdeaStatus } from '@/types/database'

interface IdeaCardProps {
  idea: IdeaWithDetails
  onClick: () => void
  highlighted?: boolean
}

export function IdeaCard({ idea, onClick, highlighted }: IdeaCardProps) {
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
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left glass-panel rounded-lg p-4 transition-all group',
        'hover:border-accent-cyan/30 hover:shadow-lg hover:shadow-accent-cyan/5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan',
        highlighted && 'animate-highlight'
      )}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-2">
        <Badge variant={statusCfg.variant} className="text-[10px]">
          {statusCfg.label}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-text-primary text-sm line-clamp-2 mb-1">
        {idea.title}
      </h3>

      {/* Body preview */}
      {idea.body && (
        <p className="text-text-tertiary text-xs italic line-clamp-2 mb-3">
          {idea.body}
        </p>
      )}

      {/* Tags */}
      {idea.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {idea.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
          {idea.tags.length > 3 && (
            <span className="text-[10px] text-text-tertiary">
              +{idea.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: creator + timestamp */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-default/50">
        <div className="flex items-center gap-1.5">
          <Avatar
            src={idea.creator?.avatar_url || undefined}
            alt={idea.creator?.display_name || 'User'}
            initials={creatorInitials}
            size="sm"
            className="!w-5 !h-5 !text-[8px]"
          />
          <span className="text-[11px] text-text-tertiary truncate max-w-[100px]">
            {idea.creator?.display_name || 'Unknown'}
          </span>
        </div>
        <span className="text-[11px] text-text-tertiary">
          {timeAgo(idea.created_at)}
        </span>
      </div>
    </button>
  )
}

export function IdeaCardSkeleton() {
  return (
    <div className="glass-panel rounded-lg p-4 animate-pulse">
      <div className="h-4 w-16 bg-bg-tertiary rounded-full mb-3" />
      <div className="h-4 w-3/4 bg-bg-tertiary rounded mb-1" />
      <div className="h-3 w-full bg-bg-tertiary rounded mb-1" />
      <div className="h-3 w-2/3 bg-bg-tertiary rounded mb-3" />
      <div className="flex gap-1 mb-3">
        <div className="h-4 w-12 bg-bg-tertiary rounded-full" />
        <div className="h-4 w-16 bg-bg-tertiary rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border-default/50">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-bg-tertiary rounded-full" />
          <div className="h-3 w-16 bg-bg-tertiary rounded" />
        </div>
        <div className="h-3 w-12 bg-bg-tertiary rounded" />
      </div>
    </div>
  )
}
