'use client'

import { useState } from 'react'
import {
  MessageSquare,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Sparkles,
  Check,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { CategoryBadge } from '@/components/lab/category-badge'
import type { FeedbackSubmission } from '@/types/database'

export type FeedbackSort = 'newest' | 'oldest' | 'highest_score'

interface LabInboxProps {
  feedback: FeedbackSubmission[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading: boolean
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  sort: FeedbackSort
  onSortChange: (sort: FeedbackSort) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
}


const STATUS_DOTS: Record<string, string> = {
  new: 'bg-accent-cyan',
  triaged: 'bg-accent-warning',
  converted: 'bg-accent-success',
  archived: 'bg-text-tertiary',
}

const SORT_OPTIONS: { value: FeedbackSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest_score', label: 'Highest score' },
]

export function LabInbox({
  feedback,
  selectedId,
  onSelect,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
  sort,
  onSortChange,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: LabInboxProps) {
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const allSelected = feedback.length > 0 && selectedIds.size === feedback.length
  const someSelected = selectedIds.size > 0 && !allSelected

  if (isLoading && feedback.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Inbox header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-default flex-shrink-0">
        {/* Select-all checkbox */}
        <div
          role="checkbox"
          aria-checked={allSelected ? 'true' : someSelected ? 'mixed' : 'false'}
          tabIndex={0}
          onClick={onToggleAll}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onToggleAll()
            }
          }}
          className={cn(
            'w-3.5 h-3.5 rounded border flex items-center justify-center cursor-pointer transition-colors flex-shrink-0',
            allSelected
              ? 'bg-accent-cyan border-accent-cyan'
              : someSelected
                ? 'bg-accent-cyan/50 border-accent-cyan'
                : 'border-text-tertiary hover:border-text-secondary'
          )}
        >
          {allSelected && <Check className="w-2.5 h-2.5 text-bg-primary" />}
          {someSelected && !allSelected && (
            <Minus className="w-2.5 h-2.5 text-bg-primary" />
          )}
        </div>

        <span className="text-xs font-medium text-text-primary">Inbox</span>
        <span className="text-[10px] text-text-tertiary bg-bg-tertiary rounded-full px-1.5 py-0.5">
          {total}
        </span>

        {/* Selected count */}
        {selectedIds.size > 0 && (
          <span className="text-[10px] text-accent-cyan font-medium">
            {selectedIds.size} selected
          </span>
        )}

        <div className="flex-1" />

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
          >
            <ArrowUpDown className="w-3 h-3" />
            {SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Sort'}
          </button>

          {sortDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-bg-secondary border border-border-default rounded-lg shadow-lg py-1 min-w-[130px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onSortChange(opt.value)
                      setSortDropdownOpen(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs transition-colors',
                      sort === opt.value
                        ? 'text-accent-cyan bg-accent-cyan/5'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Feedback list */}
      {feedback.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <EmptyState
            icon={<MessageSquare className="w-10 h-10" />}
            title="No feedback yet"
            description="Feedback submitted via API keys will appear here. Set up an app key in project settings to start collecting."
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {feedback.map((item) => (
            <FeedbackInboxItem
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              isChecked={selectedIds.has(item.id)}
              onSelect={() => onSelect(item.id)}
              onToggleCheck={() => onToggleSelect(item.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border-default flex-shrink-0">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
              page <= 1
                ? 'text-text-tertiary/40 cursor-not-allowed'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            )}
          >
            <ChevronLeft className="w-3 h-3" />
            Prev
          </button>
          <span className="text-[10px] text-text-tertiary">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
              page >= totalPages
                ? 'text-text-tertiary/40 cursor-not-allowed'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            )}
          >
            Next
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Individual inbox item ────────────────────────────────────────────

interface FeedbackInboxItemProps {
  item: FeedbackSubmission
  isSelected: boolean
  isChecked: boolean
  onSelect: () => void
  onToggleCheck: () => void
}

function FeedbackInboxItem({
  item,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
}: FeedbackInboxItemProps) {
  const isNew = item.status === 'new'

  return (
    <div
      className={cn(
        'w-full flex items-start gap-2 px-4 py-3 border-b border-border-default/50 transition-colors',
        isSelected
          ? 'bg-accent-cyan/5 border-l-2 border-l-accent-cyan'
          : isChecked
            ? 'bg-accent-cyan/3'
            : 'hover:bg-bg-tertiary/50'
      )}
    >
      {/* Checkbox */}
      <div
        role="checkbox"
        aria-checked={isChecked}
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          onToggleCheck()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggleCheck()
          }
        }}
        className={cn(
          'w-4 h-4 min-w-[16px] rounded border flex items-center justify-center cursor-pointer transition-colors mt-0.5 flex-shrink-0',
          isChecked
            ? 'bg-accent-cyan border-accent-cyan'
            : 'border-text-tertiary/50 hover:border-text-secondary'
        )}
      >
        {isChecked && <Check className="w-3 h-3 text-bg-primary" />}
      </div>

      {/* Clickable content area */}
      <button
        onClick={onSelect}
        className="flex-1 text-left min-w-0"
      >
        <div className="flex items-start gap-2">
          {/* Status dot with pulse for new */}
          <span className="relative flex-shrink-0 mt-1.5">
            <span
              className={cn(
                'block w-2 h-2 rounded-full',
                STATUS_DOTS[item.status] || 'bg-text-tertiary'
              )}
            />
            {isNew && (
              <span className="absolute inset-0 w-2 h-2 rounded-full bg-accent-cyan animate-ping opacity-50" />
            )}
          </span>

          <div className="flex-1 min-w-0">
            {/* Content preview */}
            <p className="text-sm text-text-primary line-clamp-2">
              {item.content}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-1.5">
              {/* Category badge */}
              <CategoryBadge category={item.category} size="sm" />

              {/* AI indicator */}
              {item.ai_suggested && (
                <span className="flex items-center text-[9px] text-accent-purple" title="AI-categorized">
                  <Sparkles className="w-2.5 h-2.5" />
                </span>
              )}

              {/* Priority score */}
              {item.score != null && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-tertiary" title={`Priority score: ${item.score}`}>
                  <Gauge className="w-2.5 h-2.5" />
                  {item.score}
                </span>
              )}

              {/* Submitter */}
              {(item.submitter_name || item.submitter_email) && (
                <span className="text-[10px] text-text-tertiary truncate">
                  {item.submitter_name || item.submitter_email}
                </span>
              )}

              {/* Timestamp */}
              <span
                className="text-[10px] text-text-tertiary ml-auto flex-shrink-0"
                title={new Date(item.created_at).toLocaleString()}
              >
                {timeAgo(item.created_at)}
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}
