'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  ArrowRightLeft,
  Edit3,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'

interface ActivityUser {
  display_name: string
  avatar_url: string | null
}

interface Activity {
  id: string
  action: string
  action_details: Record<string, string> | null
  user: ActivityUser
  created_at: string
}

interface BlueprintActivityTimelineProps {
  projectId: string
  blueprintId: string
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  created: { label: 'Created', icon: FileText, color: 'text-accent-success' },
  status_changed: { label: 'Status changed', icon: ArrowRightLeft, color: 'text-accent-warning' },
  content_updated: { label: 'Content updated', icon: Edit3, color: 'text-accent-cyan' },
  reviewed: { label: 'Reviewed', icon: FileText, color: 'text-accent-purple' },
  commented: { label: 'Commented', icon: FileText, color: 'text-text-secondary' },
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  implemented: 'Implemented',
}

export function BlueprintActivityTimeline({ projectId, blueprintId }: BlueprintActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  const fetchActivities = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(
        `/api/projects/${projectId}/blueprints/${blueprintId}/activities?limit=20`
      )
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
      }
    } catch {
      // Silently fail — activity timeline is supplementary
    } finally {
      setIsLoading(false)
    }
  }, [projectId, blueprintId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  if (isLoading && activities.length === 0) return null

  return (
    <div className="border-t border-border-default bg-bg-secondary">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-bg-tertiary/50 transition-colors"
      >
        <Clock className="w-3.5 h-3.5 text-text-tertiary" />
        <span className="text-xs font-medium text-text-secondary">Activity</span>
        <span className="text-[10px] text-text-tertiary bg-bg-tertiary rounded-full px-1.5 py-0.5">
          {activities.length}
        </span>
        <div className="flex-1" />
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-text-tertiary" />
        ) : (
          <ChevronDown className="w-3 h-3 text-text-tertiary" />
        )}
      </button>

      {/* Activity list */}
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto px-4 pb-3">
          {activities.length === 0 ? (
            <p className="text-[10px] text-text-tertiary py-2">No activity yet</p>
          ) : (
            <div className="space-y-0">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ActivityItem({ activity }: { activity: Activity }) {
  const config = ACTION_CONFIG[activity.action] || ACTION_CONFIG.created
  const Icon = config.icon

  const description = formatActivityDescription(activity)

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {/* Icon */}
      <div className={cn('mt-0.5 flex-shrink-0', config.color)}>
        <Icon className="w-3 h-3" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-text-secondary leading-tight">
          <span className="font-medium text-text-primary">{activity.user.display_name}</span>
          {' '}{description}
        </p>
        <p className="text-[10px] text-text-tertiary mt-0.5" title={new Date(activity.created_at).toLocaleString()}>
          {timeAgo(activity.created_at)}
        </p>
      </div>
    </div>
  )
}

function formatActivityDescription(activity: Activity): string {
  const details = activity.action_details

  switch (activity.action) {
    case 'created':
      return 'created this blueprint'
    case 'status_changed': {
      const from = STATUS_LABELS[details?.from_status || ''] || details?.from_status || '?'
      const to = STATUS_LABELS[details?.to_status || ''] || details?.to_status || '?'
      return `changed status from ${from} to ${to}`
    }
    case 'content_updated':
      return 'updated the content'
    case 'reviewed':
      return 'reviewed this blueprint'
    case 'commented':
      return 'added a comment'
    default:
      return activity.action
  }
}
