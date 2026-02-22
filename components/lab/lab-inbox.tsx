'use client'

import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import type { FeedbackSubmission } from '@/types/database'

interface LabInboxProps {
  feedback: FeedbackSubmission[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature_request: 'Feature',
  ux_issue: 'UX',
  performance: 'Performance',
  other: 'Other',
  uncategorized: 'Uncategorized',
}

const CATEGORY_COLORS: Record<string, string> = {
  bug: 'bg-accent-error/10 text-accent-error',
  feature_request: 'bg-accent-purple/10 text-accent-purple',
  ux_issue: 'bg-accent-warning/10 text-accent-warning',
  performance: 'bg-accent-cyan/10 text-accent-cyan',
  other: 'bg-bg-tertiary text-text-tertiary',
  uncategorized: 'bg-bg-tertiary text-text-tertiary',
}

const STATUS_DOTS: Record<string, string> = {
  new: 'bg-accent-cyan',
  triaged: 'bg-accent-warning',
  converted: 'bg-accent-success',
  archived: 'bg-text-tertiary',
}

export function LabInbox({ feedback, selectedId, onSelect, isLoading }: LabInboxProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (feedback.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <EmptyState
          icon={<MessageSquare className="w-10 h-10" />}
          title="No feedback yet"
          description="Feedback submitted via API keys will appear here. Set up an app key in project settings to start collecting."
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {feedback.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={cn(
            'w-full text-left px-4 py-3 border-b border-border-default/50 transition-colors',
            selectedId === item.id
              ? 'bg-accent-cyan/5 border-l-2 border-l-accent-cyan'
              : 'hover:bg-bg-tertiary/50'
          )}
        >
          <div className="flex items-start gap-2">
            {/* Status dot */}
            <span
              className={cn(
                'w-2 h-2 rounded-full flex-shrink-0 mt-1.5',
                STATUS_DOTS[item.status] || 'bg-text-tertiary'
              )}
            />

            <div className="flex-1 min-w-0">
              {/* Content preview */}
              <p className="text-sm text-text-primary line-clamp-2">
                {item.content}
              </p>

              {/* Meta row */}
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={cn(
                    'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                    CATEGORY_COLORS[item.category] || ''
                  )}
                >
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>
                {item.submitter_name && (
                  <span className="text-[10px] text-text-tertiary truncate">
                    {item.submitter_name}
                  </span>
                )}
                <span className="text-[10px] text-text-tertiary ml-auto flex-shrink-0">
                  {timeAgo(item.created_at)}
                </span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
