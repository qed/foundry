'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProject } from '@/lib/context/project-context'
import { NotificationDropdown } from './notification-dropdown'

export function NotificationBell() {
  const { project } = useProject()
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/notifications?project_id=${project.id}&is_read=false&limit=1`
      )
      if (!res.ok) return
      const data = await res.json()
      setUnreadCount(data.unread_count || 0)
    } catch {
      // Silently fail
    }
  }, [project.id])

  // Fetch unread count on mount and periodically
  useEffect(() => {
    async function doFetch() {
      await fetchUnreadCount()
    }
    doFetch()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleMarkRead = useCallback(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          isOpen
            ? 'bg-bg-tertiary text-text-primary'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-accent-error text-white text-[10px] font-semibold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          projectId={project.id}
          onClose={() => setIsOpen(false)}
          onMarkRead={handleMarkRead}
        />
      )}
    </div>
  )
}
