'use client'

import { Users } from 'lucide-react'
import type { AwarenessState } from '@/lib/collaboration/supabase-yjs-provider'

interface RemoteUsersIndicatorProps {
  remoteUsers: AwarenessState[]
  isConnected: boolean
  maxDisplay?: number
}

export function RemoteUsersIndicator({
  remoteUsers,
  isConnected,
  maxDisplay = 5,
}: RemoteUsersIndicatorProps) {
  if (!isConnected && remoteUsers.length === 0) return null

  const displayed = remoteUsers.slice(0, maxDisplay)
  const overflow = remoteUsers.length - maxDisplay

  return (
    <div className="flex items-center gap-1.5">
      {/* Connection indicator */}
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isConnected ? 'bg-accent-success' : 'bg-accent-warning animate-pulse'
        }`}
        title={isConnected ? 'Connected' : 'Connecting...'}
      />

      {/* Active editors */}
      {displayed.length > 0 && (
        <div className="flex items-center gap-0.5">
          <Users className="w-3 h-3 text-text-tertiary" />
          <div className="flex -space-x-1">
            {displayed.map((state) => (
              <div
                key={state.user.id}
                className="w-5 h-5 rounded-full border border-bg-primary flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: state.user.color + '30', borderColor: state.user.color }}
                title={`${state.user.name} is editing`}
              >
                <span className="text-[8px] font-bold" style={{ color: state.user.color }}>
                  {state.user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          {overflow > 0 && (
            <span className="text-[10px] text-text-tertiary ml-0.5">+{overflow}</span>
          )}
        </div>
      )}
    </div>
  )
}
