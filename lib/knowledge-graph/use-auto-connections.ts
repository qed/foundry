'use client'

import { useState, useCallback, useRef } from 'react'
import type { ConnectionSuggestion } from '@/components/knowledge-graph/suggestion-card'
import type { GraphEntityType } from '@/types/database'

const DISMISS_STORAGE_KEY = 'helix-auto-connections-dismissed'
const SCAN_DEBOUNCE_MS = 5000

function getDismissedKeys(sourceType: string, sourceId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${DISMISS_STORAGE_KEY}:${sourceType}:${sourceId}`)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function addDismissedKeys(sourceType: string, sourceId: string, keys: string[]) {
  try {
    const existing = getDismissedKeys(sourceType, sourceId)
    for (const k of keys) existing.add(k)
    localStorage.setItem(
      `${DISMISS_STORAGE_KEY}:${sourceType}:${sourceId}`,
      JSON.stringify([...existing])
    )
  } catch {
    // Ignore localStorage errors
  }
}

interface UseAutoConnectionsOptions {
  projectId: string
  sourceType: GraphEntityType
  sourceId: string
}

export function useAutoConnections({ projectId, sourceType, sourceId }: UseAutoConnectionsOptions) {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const executeScan = useCallback(async (content: string | object, title?: string) => {
    if (!projectId || !sourceType || !sourceId) return

    setIsScanning(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/connections/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType, sourceId, content, title }),
      })

      if (!res.ok) return

      const data = await res.json()
      const rawSuggestions: ConnectionSuggestion[] = data.suggestions || []

      // Filter out previously dismissed suggestions
      const dismissed = getDismissedKeys(sourceType, sourceId)
      const filtered = rawSuggestions.filter(
        s => !dismissed.has(`${s.target_type}:${s.target_id}`)
      )

      if (filtered.length > 0) {
        setSuggestions(filtered)
        setIsDialogOpen(true)
      }
    } catch {
      // Silently fail — auto-detection is non-critical
    } finally {
      setIsScanning(false)
    }
  }, [projectId, sourceType, sourceId])

  // Debounced scan — waits 5 seconds of inactivity before scanning
  const scan = useCallback((content: string | object, title?: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      executeScan(content, title)
    }, SCAN_DEBOUNCE_MS)
  }, [executeScan])

  // Immediate scan (no debounce) for explicit user actions
  const scanNow = useCallback((content: string | object, title?: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    executeScan(content, title)
  }, [executeScan])

  const accept = useCallback(async (selected: ConnectionSuggestion[]) => {
    setIsAccepting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/connections/suggestions/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          sourceId,
          suggestions: selected,
        }),
      })

      if (res.ok) {
        // Dismiss the non-selected ones so they don't reappear
        const selectedKeys = new Set(selected.map(s => `${s.target_type}:${s.target_id}`))
        const dismissedKeys = suggestions
          .filter(s => !selectedKeys.has(`${s.target_type}:${s.target_id}`))
          .map(s => `${s.target_type}:${s.target_id}`)
        if (dismissedKeys.length > 0) {
          addDismissedKeys(sourceType, sourceId, dismissedKeys)
        }

        setIsDialogOpen(false)
        setSuggestions([])
        return true
      }
    } catch {
      // Silently fail
    } finally {
      setIsAccepting(false)
    }
    return false
  }, [projectId, sourceType, sourceId, suggestions])

  const dismiss = useCallback(() => {
    // Store all current suggestions as dismissed
    const keys = suggestions.map(s => `${s.target_type}:${s.target_id}`)
    addDismissedKeys(sourceType, sourceId, keys)
    setIsDialogOpen(false)
    setSuggestions([])
  }, [sourceType, sourceId, suggestions])

  return {
    suggestions,
    isDialogOpen,
    isScanning,
    isAccepting,
    scan,
    scanNow,
    accept,
    dismiss,
  }
}
