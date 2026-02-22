'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/context/current-user-context'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { UserPresence, ModuleId } from './types'

const MODULE_IDS: ModuleId[] = ['hall', 'shop', 'room', 'floor', 'lab']

/**
 * Detect the current module from the URL pathname.
 */
export function useCurrentModule(): ModuleId | null {
  const pathname = usePathname()
  return MODULE_IDS.find((m) => pathname.includes(`/${m}`)) ?? null
}

/**
 * Subscribe to project presence via Supabase Realtime.
 * Tracks which users are online and which module they're viewing.
 */
export function usePresence(projectId: string) {
  const { user } = useCurrentUser()
  const currentModule = useCurrentModule()
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Sync presence state from channel
  const syncPresence = useCallback((channel: RealtimeChannel) => {
    const state = channel.presenceState<UserPresence>()
    const users: UserPresence[] = []
    for (const key of Object.keys(state)) {
      const presences = state[key]
      if (presences && presences.length > 0) {
        users.push(presences[0])
      }
    }
    setOnlineUsers(users)
  }, [])

  // Subscribe on mount, cleanup on unmount
  useEffect(() => {
    const channel = supabase.channel(`project:${projectId}:presence`, {
      config: {
        presence: { key: user.id },
      },
    })

    channel.on('presence', { event: 'sync' }, () => {
      syncPresence(channel)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          current_module: currentModule,
          joined_at: Date.now(),
        } satisfies UserPresence)
      }
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
    // Only re-subscribe when projectId or user.id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user.id])

  // Update presence when module changes (without re-subscribing)
  useEffect(() => {
    const channel = channelRef.current
    if (!channel) return

    const updateModule = async () => {
      await channel.track({
        user_id: user.id,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        current_module: currentModule,
        joined_at: Date.now(),
      } satisfies UserPresence)
    }

    updateModule()
  }, [currentModule, user.id, user.display_name, user.avatar_url])

  const isOnline = useCallback(
    (userId: string) => onlineUsers.some((u) => u.user_id === userId),
    [onlineUsers]
  )

  const getUsersInModule = useCallback(
    (moduleId: ModuleId) => onlineUsers.filter((u) => u.current_module === moduleId),
    [onlineUsers]
  )

  return { onlineUsers, isOnline, getUsersInModule }
}
