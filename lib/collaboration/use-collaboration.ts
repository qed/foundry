'use client'

import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { SupabaseYjsProvider, type AwarenessState } from './supabase-yjs-provider'
import { getUserColor } from './colors'
import { useCurrentUser } from '@/lib/context/current-user-context'

interface UseCollaborationOptions {
  documentId: string
  documentType: 'requirement' | 'blueprint'
  projectId: string
  enabled?: boolean
}

interface UseCollaborationReturn {
  ydoc: Y.Doc | null
  provider: SupabaseYjsProvider | null
  remoteUsers: AwarenessState[]
  isConnected: boolean
  updateCursor: (anchor: number, head: number) => void
}

/**
 * Hook that sets up Yjs collaborative editing via Supabase Realtime.
 * When enabled, creates a Y.Doc and a SupabaseYjsProvider for the document.
 */
export function useCollaboration({
  documentId,
  documentType,
  projectId,
  enabled = false,
}: UseCollaborationOptions): UseCollaborationReturn {
  const { user } = useCurrentUser()
  const [remoteUsers, setRemoteUsers] = useState<AwarenessState[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
  const [provider, setProvider] = useState<SupabaseYjsProvider | null>(null)

  useEffect(() => {
    if (!enabled || !documentId || !user?.id) return

    let cancelled = false
    const doc = new Y.Doc()
    const channelName = `collab:${projectId}:${documentType}:${documentId}`
    const prov = new SupabaseYjsProvider(channelName, doc, user.id)

    // Set awareness (user info)
    prov.connect()
    prov.setAwarenessState({
      user: {
        id: user.id,
        name: user.display_name,
        color: getUserColor(user.id),
        avatar: user.avatar_url,
      },
    })

    // Track remote users
    const unsubscribe = prov.onAwarenessChange(() => {
      setRemoteUsers(prov.getRemoteStates())
    })

    // Track connection state
    const checkConnection = setInterval(() => {
      setIsConnected(prov.connected)
    }, 1000)

    // Expose to React after microtask to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      if (!cancelled) {
        setYdoc(doc)
        setProvider(prov)
      }
    })

    return () => {
      cancelled = true
      clearInterval(checkConnection)
      unsubscribe()
      prov.destroy()
      doc.destroy()
      setYdoc(null)
      setProvider(null)
      setRemoteUsers([])
      setIsConnected(false)
    }
  }, [enabled, documentId, documentType, projectId, user?.id, user?.display_name, user?.avatar_url])

  const updateCursor = (anchor: number, head: number) => {
    if (!provider || !user) return
    provider.setAwarenessState({
      user: {
        id: user.id,
        name: user.display_name,
        color: getUserColor(user.id),
        avatar: user.avatar_url,
      },
      cursor: { anchor, head },
    })
  }

  return {
    ydoc,
    provider,
    remoteUsers,
    isConnected,
    updateCursor,
  }
}
