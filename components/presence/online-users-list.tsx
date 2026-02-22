'use client'

import { Avatar } from '@/components/ui/avatar'
import type { UserPresence } from '@/lib/presence/types'

interface OnlineUsersListProps {
  users: UserPresence[]
  maxDisplay?: number
}

export function OnlineUsersList({ users, maxDisplay = 5 }: OnlineUsersListProps) {
  if (users.length === 0) return null

  const visible = users.slice(0, maxDisplay)
  const overflow = users.length - maxDisplay

  return (
    <div className="flex items-center -space-x-2" aria-label={`${users.length} user${users.length !== 1 ? 's' : ''} online`}>
      {visible.map((user) => (
        <div key={user.user_id} className="relative" title={user.display_name}>
          <Avatar
            alt={user.display_name}
            initials={user.display_name.slice(0, 2).toUpperCase()}
            src={user.avatar_url || undefined}
            size="sm"
            className="w-6 h-6 text-[10px] ring-2 ring-bg-primary"
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-accent-success rounded-full ring-1 ring-bg-primary" />
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-[10px] text-text-secondary ring-2 ring-bg-primary">
          +{overflow}
        </div>
      )}
    </div>
  )
}
