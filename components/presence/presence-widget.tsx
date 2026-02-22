'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { useProject } from '@/lib/context/project-context'
import { usePresence } from '@/lib/presence/hooks'
import { OnlineUsersList } from './online-users-list'
import { PresenceSidebar } from './presence-sidebar'
import { cn } from '@/lib/utils'

interface PresenceWidgetProps {
  collapsed?: boolean
}

/**
 * Compact presence widget for the sidebar footer.
 * Shows avatar stack when collapsed, expandable detail panel when open.
 */
export function PresenceWidget({ collapsed = false }: PresenceWidgetProps) {
  const { project } = useProject()
  const { onlineUsers, getUsersInModule } = usePresence(project.id)
  const [expanded, setExpanded] = useState(false)

  // Exclude current user count for "others online" display
  const otherUsers = onlineUsers

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 py-2">
        <div className="relative">
          <Users className="w-4 h-4 text-text-tertiary" />
          {otherUsers.length > 0 && (
            <div className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-accent-success rounded-full flex items-center justify-center">
              <span className="text-[8px] font-bold text-bg-primary">{otherUsers.length}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-border-default">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-bg-tertiary',
          expanded && 'bg-bg-tertiary'
        )}
      >
        <Users className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        <span className="text-xs text-text-secondary flex-1">
          {otherUsers.length} online
        </span>
        <OnlineUsersList users={otherUsers} maxDisplay={3} />
      </button>

      {expanded && (
        <div className="pb-2 max-h-48 overflow-y-auto">
          <PresenceSidebar onlineUsers={otherUsers} getUsersInModule={getUsersInModule} />
        </div>
      )}
    </div>
  )
}
