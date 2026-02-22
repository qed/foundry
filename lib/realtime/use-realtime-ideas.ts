'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Idea } from '@/types/database'

type IdeaChangeHandler = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Idea | null
  old: Partial<Idea> | null
}) => void

/**
 * Subscribe to real-time Postgres changes on the ideas table
 * for a specific project. Calls `onChange` for each event.
 */
export function useRealtimeIdeas(projectId: string, onChange: IdeaChangeHandler) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Stable ref to avoid re-subscribing on handler changes
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const channel = supabase
      .channel(`ideas:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ideas',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          onChangeRef.current({
            eventType: 'INSERT',
            new: payload.new as Idea,
            old: null,
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ideas',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          onChangeRef.current({
            eventType: 'UPDATE',
            new: payload.new as Idea,
            old: payload.old as Partial<Idea>,
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'ideas',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          onChangeRef.current({
            eventType: 'DELETE',
            new: null,
            old: payload.old as Partial<Idea>,
          })
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      setIsConnected(false)
    }
  }, [projectId])

  return { isConnected }
}
