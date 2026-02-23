'use client'

import { useState, useEffect, useCallback } from 'react'
import { Monitor, Moon, Sun, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast-container'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
] as const

interface NotificationPrefs {
  email_on_mention: boolean
  email_on_comment: boolean
  email_on_assignment: boolean
  email_on_feedback: boolean
}

const NOTIF_LABELS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: 'email_on_mention', label: 'Mentions', description: 'When someone @mentions you' },
  { key: 'email_on_comment', label: 'Comments', description: 'When someone comments on your items' },
  { key: 'email_on_assignment', label: 'Assignments', description: 'When you are assigned a work order' },
  { key: 'email_on_feedback', label: 'Feedback', description: 'When new feedback is received' },
]

interface PreferencesTabProps {
  initialProfile: Profile
}

export function PreferencesTab({ initialProfile }: PreferencesTabProps) {
  const { addToast } = useToast()
  const [theme, setTheme] = useState(initialProfile.theme_preference || 'dark')
  const [savingTheme, setSavingTheme] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null)
  const [loadingNotifs, setLoadingNotifs] = useState(true)
  const [savingNotif, setSavingNotif] = useState<string | null>(null)

  // Fetch notification preferences
  useEffect(() => {
    async function doFetch() {
      try {
        const res = await fetch('/api/users/notification-preferences')
        if (res.ok) {
          const data = await res.json()
          setNotifPrefs(data)
        }
      } catch {
        // Silently fail
      } finally {
        setLoadingNotifs(false)
      }
    }
    doFetch()
  }, [])

  async function handleThemeChange(newTheme: string) {
    setTheme(newTheme)
    setSavingTheme(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme_preference: newTheme }),
      })

      if (!res.ok) {
        throw new Error('Failed to save theme')
      }

      addToast('Theme preference saved', 'success')
    } catch {
      addToast('Failed to save theme', 'error')
      setTheme(initialProfile.theme_preference || 'dark')
    } finally {
      setSavingTheme(false)
    }
  }

  const handleNotifToggle = useCallback(
    async (key: keyof NotificationPrefs) => {
      if (!notifPrefs) return
      const newValue = !notifPrefs[key]

      setNotifPrefs((prev) => (prev ? { ...prev, [key]: newValue } : prev))
      setSavingNotif(key)

      try {
        const res = await fetch('/api/users/notification-preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: newValue }),
        })
        if (!res.ok) {
          setNotifPrefs((prev) => (prev ? { ...prev, [key]: !newValue } : prev))
          addToast('Failed to update preference', 'error')
        }
      } catch {
        setNotifPrefs((prev) => (prev ? { ...prev, [key]: !newValue } : prev))
      } finally {
        setSavingNotif(null)
      }
    },
    [notifPrefs, addToast]
  )

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Theme</h2>
        <p className="text-xs text-text-tertiary mb-4">
          Choose your preferred color scheme
        </p>

        <div className="flex gap-3">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleThemeChange(value)}
              disabled={savingTheme}
              className={cn(
                'flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                theme === value
                  ? 'border-accent-cyan bg-accent-cyan/5'
                  : 'border-border-default bg-bg-secondary hover:border-text-tertiary'
              )}
            >
              <Icon className={cn(
                'w-5 h-5',
                theme === value ? 'text-accent-cyan' : 'text-text-tertiary'
              )} />
              <span className={cn(
                'text-xs font-medium',
                theme === value ? 'text-accent-cyan' : 'text-text-secondary'
              )}>
                {label}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-text-tertiary">
          Note: Full theme switching will be available in a future update. Your preference is saved.
        </p>
      </div>

      {/* Email Notifications */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Email Notifications</h2>
        <p className="text-xs text-text-tertiary mb-4">
          Choose which events trigger email notifications
        </p>

        {loadingNotifs ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
          </div>
        ) : notifPrefs ? (
          <div className="space-y-3">
            {NOTIF_LABELS.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary">{label}</p>
                  <p className="text-xs text-text-tertiary">{description}</p>
                </div>
                <button
                  onClick={() => handleNotifToggle(key)}
                  disabled={savingNotif === key}
                  className={cn(
                    'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
                    notifPrefs[key] ? 'bg-accent-cyan' : 'bg-bg-tertiary border border-border-default'
                  )}
                >
                  {savingNotif === key ? (
                    <Loader2 className="absolute top-0.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 text-white animate-spin" />
                  ) : (
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                        notifPrefs[key] ? 'translate-x-5' : 'translate-x-0.5'
                      )}
                    />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">Unable to load preferences</p>
        )}
      </div>
    </div>
  )
}
