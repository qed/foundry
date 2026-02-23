'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationItem } from './notification-item'

interface NotificationData {
  id: string
  type: string
  title: string
  body: string | null
  link_url: string | null
  source_entity_type: string | null
  is_read: boolean
  created_at: string
  triggered_by_user: {
    id: string
    name: string
    avatar_url: string | null
  } | null
}

interface NotificationDropdownProps {
  projectId: string
  onClose: () => void
  onMarkRead: () => void
}

export function NotificationDropdown({
  projectId,
  onClose,
  onMarkRead,
}: NotificationDropdownProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingAllRead, setMarkingAllRead] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(
        `/api/notifications?project_id=${projectId}&limit=30`
      )
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/notifications/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_read: true }),
        })
        if (!res.ok) return

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
        onMarkRead()
      } catch {
        // Silently fail
      }
    },
    [onMarkRead]
  )

  const handleMarkAllAsRead = useCallback(async () => {
    setMarkingAllRead(true)
    try {
      const res = await fetch(
        `/api/notifications/mark-all-read?project_id=${projectId}`,
        { method: 'PATCH' }
      )
      if (!res.ok) return

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
      onMarkRead()
    } catch {
      // Silently fail
    } finally {
      setMarkingAllRead(false)
    }
  }, [projectId, onMarkRead])

  const handleNavigate = useCallback(
    (url: string) => {
      onClose()
      router.push(url)
    },
    [onClose, router]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/notifications/${id}`, {
          method: 'DELETE',
        })
        if (!res.ok) return

        setNotifications((prev) => prev.filter((n) => n.id !== id))
        onMarkRead()
      } catch {
        // Silently fail
      }
    },
    [onMarkRead]
  )

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-bg-tertiary rounded-lg shadow-xl border border-border-default z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-default">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-medium text-accent-cyan bg-accent-cyan/10 rounded-full px-1.5 py-0.5">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAllRead}
            className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
          >
            {markingAllRead ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCheck className="w-3 h-3" />
            )}
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-text-tertiary">No notifications yet</p>
          </div>
        ) : (
          <div className="py-1">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onNavigate={handleNavigate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          className={cn(
            'px-4 py-2 border-t border-border-default text-center'
          )}
        >
          <button
            onClick={() => {
              // For now, just close — full page can be added in a future phase
              onClose()
            }}
            className="text-[11px] text-accent-cyan hover:text-accent-cyan/80 transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}
