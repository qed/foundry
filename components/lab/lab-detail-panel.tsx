'use client'

import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import type { FeedbackSubmission } from '@/types/database'

interface LabDetailPanelProps {
  feedback: FeedbackSubmission | null
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-accent-cyan/10 text-accent-cyan',
  triaged: 'bg-accent-warning/10 text-accent-warning',
  converted: 'bg-accent-success/10 text-accent-success',
  archived: 'bg-text-tertiary/10 text-text-tertiary',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  triaged: 'Triaged',
  converted: 'Converted',
  archived: 'Archived',
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug Report',
  feature_request: 'Feature Request',
  ux_issue: 'UX Issue',
  performance: 'Performance',
  other: 'Other',
  uncategorized: 'Uncategorized',
}

export function LabDetailPanel({ feedback }: LabDetailPanelProps) {
  if (!feedback) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={<MessageSquare className="w-12 h-12" />}
          title="Select feedback to view details"
          description="Choose an item from the inbox on the left to see its full content and take action."
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Detail header */}
      <div className="h-12 flex items-center gap-3 px-4 border-b border-border-default flex-shrink-0">
        <span
          className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded-full',
            STATUS_STYLES[feedback.status] || ''
          )}
        >
          {STATUS_LABELS[feedback.status] || feedback.status}
        </span>
        <span className="text-xs text-text-tertiary">
          {CATEGORY_LABELS[feedback.category] || feedback.category}
        </span>
        <div className="flex-1" />
        {feedback.score !== null && (
          <span className="text-xs text-text-secondary">
            Score: <span className="font-medium text-text-primary">{feedback.score}</span>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          {/* Content body */}
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {feedback.content}
          </p>

          {/* Tags */}
          {feedback.tags && feedback.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {feedback.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="mt-6 space-y-2 text-xs text-text-tertiary">
            {feedback.submitter_name && (
              <p>
                From: <span className="text-text-secondary">{feedback.submitter_name}</span>
                {feedback.submitter_email && (
                  <> ({feedback.submitter_email})</>
                )}
              </p>
            )}
            <p>
              Submitted: {new Date(feedback.created_at).toLocaleString()}
            </p>
            <p>
              Updated: {new Date(feedback.updated_at).toLocaleString()}
            </p>
          </div>

          {/* Action buttons placeholder */}
          <div className="mt-6 flex items-center gap-2">
            <button
              disabled
              className="px-3 py-1.5 bg-accent-cyan/10 text-accent-cyan rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
            >
              Convert to Work Order
            </button>
            <button
              disabled
              className="px-3 py-1.5 bg-accent-purple/10 text-accent-purple rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
            >
              Convert to Feature
            </button>
          </div>
          <p className="text-[10px] text-text-tertiary mt-2">
            Conversion actions coming in Phase 088 & 089
          </p>
        </div>
      </div>
    </div>
  )
}
