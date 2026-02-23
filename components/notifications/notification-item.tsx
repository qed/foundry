'use client'

import {
  AtSign,
  MessageSquare,
  UserPlus,
  RefreshCw,
  MessageCircle,
  X,
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'

const TYPE_CONFIG: Record<
  string,
  { icon: typeof AtSign; color: string; label: string }
> = {
  mention: { icon: AtSign, color: 'text-accent-purple', label: 'Mention' },
  comment: { icon: MessageSquare, color: 'text-accent-cyan', label: 'Comment' },
  assignment: { icon: UserPlus, color: 'text-accent-success', label: 'Assignment' },
  status_change: { icon: RefreshCw, color: 'text-accent-warning', label: 'Status' },
  feedback: { icon: MessageCircle, color: 'text-accent-error', label: 'Feedback' },
}

interface NotificationData {
  id: string
  type: string
  title: string
  body: string | null
  link_url: string | null
  is_read: boolean
  created_at: string
  triggered_by_user: {
    id: string
    name: string
    avatar_url: string | null
  } | null
}

interface NotificationItemProps {
  notification: NotificationData
  onMarkAsRead: (id: string) => void
  onNavigate: (url: string) => void
  onDelete: (id: string) => void
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onNavigate,
  onDelete,
}: NotificationItemProps) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.comment
  const TypeIcon = config.icon

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id)
    }
    if (notification.link_url) {
      onNavigate(notification.link_url)
    }
  }

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-4 py-2.5 transition-colors cursor-pointer',
        notification.is_read
          ? 'hover:bg-bg-secondary/50'
          : 'bg-accent-cyan/3 hover:bg-accent-cyan/5'
      )}
      onClick={handleClick}
    >
      {/* Unread dot */}
      {!notification.is_read && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-cyan" />
      )}

      {/* Type icon */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5',
          config.color,
          notification.is_read ? 'bg-bg-secondary/50' : 'bg-bg-secondary'
        )}
      >
        <TypeIcon className="w-3.5 h-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-xs leading-tight',
            notification.is_read ? 'text-text-secondary' : 'text-text-primary font-medium'
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-[11px] text-text-tertiary mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {notification.triggered_by_user && (
            <span className="text-[10px] text-text-tertiary">
              {notification.triggered_by_user.name}
            </span>
          )}
          <span className="text-[10px] text-text-tertiary">
            {timeAgo(notification.created_at)}
          </span>
        </div>
      </div>

      {/* Actions — show on hover */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
          className="p-1 text-text-tertiary hover:text-accent-error rounded transition-colors"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
