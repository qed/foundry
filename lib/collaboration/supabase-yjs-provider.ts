import * as Y from 'yjs'
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Custom Yjs provider that uses Supabase Realtime broadcast channels
 * for syncing document updates between collaborative editors.
 *
 * Architecture:
 * - Uses broadcast channel for Yjs document updates (base64-encoded)
 * - Uses presence for awareness (cursor positions, user info)
 * - Loads initial content from the editor, then Yjs manages state
 */
export class SupabaseYjsProvider {
  doc: Y.Doc
  channel: RealtimeChannel | null = null
  awareness: Map<string, AwarenessState> = new Map()

  private channelName: string
  private isConnected = false
  private isSynced = false
  private localClientId: string
  private awarenessChangeCallbacks: Set<() => void> = new Set()

  constructor(
    channelName: string,
    doc: Y.Doc,
    private userId: string,
  ) {
    this.channelName = channelName
    this.doc = doc
    this.localClientId = `${userId}-${Date.now()}`
  }

  connect() {
    if (this.isConnected) return

    this.channel = supabase.channel(this.channelName)

    // Listen for remote Yjs updates
    this.channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
      if (payload.clientId === this.localClientId) return
      try {
        const update = Uint8Array.from(atob(payload.update), c => c.charCodeAt(0))
        Y.applyUpdate(this.doc, update, 'remote')
      } catch {
        // Ignore malformed updates
      }
    })

    // Listen for awareness updates (cursor positions)
    this.channel.on('broadcast', { event: 'awareness' }, ({ payload }) => {
      if (payload.clientId === this.localClientId) return
      this.awareness.set(payload.clientId, payload.state)
      this.notifyAwarenessChange()
    })

    // Listen for awareness cleanup
    this.channel.on('broadcast', { event: 'awareness-leave' }, ({ payload }) => {
      this.awareness.delete(payload.clientId)
      this.notifyAwarenessChange()
    })

    // Subscribe to channel
    this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.isConnected = true
        this.isSynced = true

        // Request current state from others
        this.channel?.send({
          type: 'broadcast',
          event: 'sync-request',
          payload: { clientId: this.localClientId },
        })
      }
    })

    // Listen for sync requests and respond with full state
    this.channel.on('broadcast', { event: 'sync-request' }, ({ payload }) => {
      if (payload.clientId === this.localClientId) return
      const state = Y.encodeStateAsUpdate(this.doc)
      const encoded = btoa(String.fromCharCode(...state))
      this.channel?.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { clientId: this.localClientId, update: encoded },
      })
    })

    // Observe local doc changes and broadcast
    this.doc.on('update', (update: Uint8Array, origin: string) => {
      if (origin === 'remote') return // Don't re-broadcast remote updates
      if (!this.isConnected) return

      const encoded = btoa(String.fromCharCode(...update))
      this.channel?.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { clientId: this.localClientId, update: encoded },
      })
    })

    return this
  }

  /**
   * Set awareness state (user info + cursor position).
   */
  setAwarenessState(state: AwarenessState) {
    this.awareness.set(this.localClientId, state)
    this.channel?.send({
      type: 'broadcast',
      event: 'awareness',
      payload: { clientId: this.localClientId, state },
    })
  }

  /**
   * Subscribe to awareness changes (cursor updates from other users).
   */
  onAwarenessChange(callback: () => void) {
    this.awarenessChangeCallbacks.add(callback)
    return () => {
      this.awarenessChangeCallbacks.delete(callback)
    }
  }

  /**
   * Get all remote awareness states (excluding local user).
   */
  getRemoteStates(): AwarenessState[] {
    return Array.from(this.awareness.entries())
      .filter(([id]) => id !== this.localClientId)
      .map(([, state]) => state)
  }

  private notifyAwarenessChange() {
    for (const cb of this.awarenessChangeCallbacks) {
      cb()
    }
  }

  disconnect() {
    // Notify others we're leaving
    this.channel?.send({
      type: 'broadcast',
      event: 'awareness-leave',
      payload: { clientId: this.localClientId },
    })

    this.channel?.unsubscribe()
    this.channel = null
    this.isConnected = false
    this.awareness.clear()
  }

  get connected() {
    return this.isConnected
  }

  get synced() {
    return this.isSynced
  }

  destroy() {
    this.disconnect()
    this.awarenessChangeCallbacks.clear()
  }
}

export interface AwarenessState {
  user: {
    id: string
    name: string
    color: string
    avatar?: string | null
  }
  cursor?: {
    anchor: number
    head: number
  } | null
}
