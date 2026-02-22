'use client'

import { Avatar } from '@/components/ui/avatar'
import { MODULE_LABELS } from '@/lib/presence/types'
import type { UserPresence, ModuleId } from '@/lib/presence/types'

interface PresenceSidebarProps {
  onlineUsers: UserPresence[]
  getUsersInModule: (moduleId: ModuleId) => UserPresence[]
}

const MODULE_ORDER: ModuleId[] = ['hall', 'shop', 'room', 'floor', 'lab']

export function PresenceSidebar({ onlineUsers, getUsersInModule }: PresenceSidebarProps) {
  if (onlineUsers.length === 0) {
    return (
      <div className="px-3 py-2">
        <p className="text-xs text-text-tertiary">No one else is online</p>
      </div>
    )
  }

  // Users on a module page
  const moduleSections = MODULE_ORDER.map((moduleId) => ({
    moduleId,
    label: MODULE_LABELS[moduleId],
    users: getUsersInModule(moduleId),
  })).filter((s) => s.users.length > 0)

  // Users on dashboard / no module
  const dashboardUsers = onlineUsers.filter((u) => u.current_module === null)

  return (
    <div className="space-y-3">
      <p className="px-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
        Online ({onlineUsers.length})
      </p>

      {dashboardUsers.length > 0 && (
        <div className="px-3">
          <p className="text-xs text-text-tertiary mb-1.5">Dashboard</p>
          <div className="space-y-1">
            {dashboardUsers.map((user) => (
              <PresenceUserRow key={user.user_id} user={user} />
            ))}
          </div>
        </div>
      )}

      {moduleSections.map(({ moduleId, label, users }) => (
        <div key={moduleId} className="px-3">
          <p className="text-xs text-text-tertiary mb-1.5">{label}</p>
          <div className="space-y-1">
            {users.map((user) => (
              <PresenceUserRow key={user.user_id} user={user} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PresenceUserRow({ user }: { user: UserPresence }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="relative">
        <Avatar
          alt={user.display_name}
          initials={user.display_name.slice(0, 2).toUpperCase()}
          src={user.avatar_url || undefined}
          size="sm"
          className="w-5 h-5 text-[8px]"
        />
        <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-accent-success rounded-full ring-1 ring-bg-secondary" />
      </div>
      <span className="text-xs text-text-secondary truncate">{user.display_name}</span>
    </div>
  )
}
