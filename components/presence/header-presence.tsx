'use client'

import { useProject } from '@/lib/context/project-context'
import { usePresence, useCurrentModule } from '@/lib/presence/hooks'
import { OnlineUsersList } from './online-users-list'

/**
 * Compact presence display for the header bar.
 * Shows avatars of users in the same module.
 */
export function HeaderPresence() {
  const { project } = useProject()
  const { onlineUsers, getUsersInModule } = usePresence(project.id)
  const currentModule = useCurrentModule()

  // Show users in the same module, or all users if on dashboard
  const relevantUsers = currentModule ? getUsersInModule(currentModule) : onlineUsers

  if (relevantUsers.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <OnlineUsersList users={relevantUsers} maxDisplay={4} />
      <span className="text-xs text-text-tertiary hidden sm:block">
        {relevantUsers.length} here
      </span>
    </div>
  )
}
