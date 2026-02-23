'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Preferences {
  email_on_mention: boolean
  email_on_comment: boolean
  email_on_assignment: boolean
  email_on_feedback: boolean
}

const PREF_LABELS: { key: keyof Preferences; label: string }[] = [
  { key: 'email_on_mention', label: 'Mentions' },
  { key: 'email_on_comment', label: 'Comments' },
  { key: 'email_on_assignment', label: 'Assignments' },
  { key: 'email_on_feedback', label: 'Feedback' },
]

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    async function doFetch() {
      try {
        const res = await fetch('/api/users/notification-preferences')
        if (!res.ok) return
        const data = await res.json()
        setPrefs(data)
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }
    doFetch()
  }, [])

  const handleToggle = useCallback(
    async (key: keyof Preferences) => {
      if (!prefs) return
      const newValue = !prefs[key]

      // Optimistic update
      setPrefs((prev) => (prev ? { ...prev, [key]: newValue } : prev))
      setSaving(key)

      try {
        const res = await fetch('/api/users/notification-preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: newValue }),
        })
        if (!res.ok) {
          // Revert on failure
          setPrefs((prev) => (prev ? { ...prev, [key]: !newValue } : prev))
        }
      } catch {
        setPrefs((prev) => (prev ? { ...prev, [key]: !newValue } : prev))
      } finally {
        setSaving(null)
      }
    },
    [prefs]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
      </div>
    )
  }

  if (!prefs) return null

  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
        Email me about
      </p>
      <div className="space-y-1.5">
        {PREF_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleToggle(key)}
            className="flex items-center gap-2 w-full text-left py-1 group"
          >
            <div
              className={cn(
                'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors border',
                prefs[key]
                  ? 'bg-accent-cyan border-accent-cyan'
                  : 'border-border-default bg-transparent group-hover:border-text-tertiary'
              )}
            >
              {saving === key ? (
                <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
              ) : prefs[key] ? (
                <Check className="w-2.5 h-2.5 text-bg-primary" />
              ) : null}
            </div>
            <span
              className={cn(
                'text-xs transition-colors',
                prefs[key] ? 'text-text-primary' : 'text-text-tertiary'
              )}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
