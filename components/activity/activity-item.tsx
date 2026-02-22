'use client'

import { Avatar } from '@/components/ui/avatar'
import { formatAction, formatEntityType, getActionColor } from '@/lib/activity/utils'
import { timeAgo } from '@/lib/utils'
import type { Json } from '@/types/database'

interface ActivityWithUser {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  action: string
  details: Json
  created_at: string
  user: { id: string; display_name: string; avatar_url: string | null } | null
}

interface ActivityItemProps {
  activity: ActivityWithUser
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const displayName = activity.user?.display_name || 'Unknown user'
  const details = activity.details as Record<string, unknown> | null

  // Try to extract an entity name from details
  const entityName =
    (details?.name as string) ||
    (details?.title as string) ||
    (details?.new_values as Record<string, unknown>)?.name as string ||
    null

  return (
    <div className="flex gap-3 px-4 py-3">
      <Avatar
        alt={displayName}
        initials={displayName.slice(0, 2).toUpperCase()}
        src={activity.user?.avatar_url || undefined}
        size="sm"
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary">
          <span className="font-medium">{displayName}</span>{' '}
          <span className={getActionColor(activity.action)}>
            {formatAction(activity.action)}
          </span>
          {entityName && (
            <>
              {' — '}
              <span className="text-text-secondary">{entityName}</span>
            </>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-tertiary">
            {formatEntityType(activity.entity_type)}
          </span>
          <span className="text-xs text-text-tertiary">
            {timeAgo(activity.created_at)}
          </span>
        </div>
        {typeof details?.change_summary === 'string' && (
          <p className="text-xs text-text-tertiary mt-1">
            {details.change_summary}
          </p>
        )}
      </div>
    </div>
  )
}
