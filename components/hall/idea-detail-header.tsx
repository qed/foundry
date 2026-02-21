'use client'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { timeAgo } from '@/lib/utils'
import { STATUS_CONFIG, type IdeaWithDetails } from './types'
import type { IdeaStatus } from '@/types/database'

interface IdeaDetailHeaderProps {
  idea: IdeaWithDetails
}

export function IdeaDetailHeader({ idea }: IdeaDetailHeaderProps) {
  const statusCfg = STATUS_CONFIG[idea.status as IdeaStatus]

  const creatorName = idea.creator?.display_name || 'Unknown'
  const creatorInitials = creatorName !== 'Unknown'
    ? creatorName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const createdTime = timeAgo(idea.created_at)
  const showUpdated = idea.updated_at !== idea.created_at

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div>
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
      </div>

      {/* Creator info */}
      <div className="flex items-center gap-3">
        <Avatar
          src={idea.creator?.avatar_url || undefined}
          alt={creatorName}
          initials={creatorInitials}
          size="md"
        />
        <div>
          <p className="text-sm font-medium text-text-primary">{creatorName}</p>
          <p className="text-xs text-text-tertiary">
            Created {createdTime}
            {showUpdated && ` · Updated ${timeAgo(idea.updated_at)}`}
          </p>
        </div>
      </div>
    </div>
  )
}
