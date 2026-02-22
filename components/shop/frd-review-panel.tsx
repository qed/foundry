'use client'

import { useState, useCallback } from 'react'
import {
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Info,
  ClipboardCopy,
  X,
  FileSearch,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// --- Types ---

export interface ReviewIssue {
  id: string
  severity: 'low' | 'medium' | 'high'
  type: string
  section: string
  quote: string | null
  message: string
  suggestion: string
}

export interface FRDReviewResult {
  frdTitle: string
  issues: ReviewIssue[]
  summary: string
  overallQuality: string
  estimatedCompleteness: number
}

interface FRDReviewPanelProps {
  review: FRDReviewResult
  onDismiss: () => void
}

// --- Helpers ---

const SEVERITY_CONFIG = {
  high: {
    label: 'High',
    icon: AlertTriangle,
    color: 'text-accent-error',
    bg: 'bg-accent-error/10',
    border: 'border-accent-error/30',
  },
  medium: {
    label: 'Medium',
    icon: AlertCircle,
    color: 'text-accent-warning',
    bg: 'bg-accent-warning/10',
    border: 'border-accent-warning/30',
  },
  low: {
    label: 'Low',
    icon: Info,
    color: 'text-accent-cyan',
    bg: 'bg-accent-cyan/10',
    border: 'border-accent-cyan/30',
  },
} as const

const TYPE_LABELS: Record<string, string> = {
  ambiguity: 'Ambiguity',
  missing_acceptance_criteria: 'Missing Criteria',
  missing_edge_cases: 'Missing Edge Cases',
  testability: 'Testability',
  consistency: 'Consistency',
  scope_clarity: 'Scope Clarity',
  completeness: 'Completeness',
}

function getQualityColor(quality: string): string {
  switch (quality.toLowerCase()) {
    case 'excellent': return 'text-accent-success'
    case 'good': return 'text-accent-cyan'
    case 'fair': return 'text-accent-warning'
    case 'poor': return 'text-accent-error'
    default: return 'text-text-secondary'
  }
}

function groupBySeverity(issues: ReviewIssue[]): Record<string, ReviewIssue[]> {
  const groups: Record<string, ReviewIssue[]> = { high: [], medium: [], low: [] }
  for (const issue of issues) {
    const key = issue.severity in groups ? issue.severity : 'low'
    groups[key].push(issue)
  }
  return groups
}

// --- Issue Card ---

function ReviewIssueCard({
  issue,
  isExpanded,
  onToggle,
}: {
  issue: ReviewIssue
  isExpanded: boolean
  onToggle: () => void
}) {
  const [copied, setCopied] = useState(false)
  const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.low
  const SeverityIcon = config.icon

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(issue.suggestion).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [issue.suggestion])

  return (
    <div className={cn('rounded-md border', config.border, config.bg)}>
      <button
        onClick={onToggle}
        className="w-full text-left flex items-start gap-1.5 px-2.5 py-2 hover:bg-black/5 transition-colors"
      >
        <ChevronDown
          className={cn(
            'w-3 h-3 flex-shrink-0 mt-0.5 text-text-tertiary transition-transform',
            !isExpanded && '-rotate-90'
          )}
        />
        <SeverityIcon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-primary leading-relaxed">{issue.message}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-text-tertiary">
              {TYPE_LABELS[issue.type] || issue.type}
            </span>
            <span className="text-[10px] text-text-tertiary">
              &middot; {issue.section}
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-2.5 pb-2.5 pt-0 ml-6 space-y-2">
          {issue.quote && (
            <div className="bg-bg-primary/50 border-l-2 border-text-tertiary px-2 py-1.5 rounded-r">
              <p className="text-[10px] text-text-tertiary italic leading-relaxed">
                &ldquo;{issue.quote}&rdquo;
              </p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-0.5">
              Suggestion
            </p>
            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
              {issue.suggestion}
            </p>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 text-accent-cyan border border-accent-cyan/30 rounded hover:bg-accent-cyan/10 transition-colors"
            >
              <ClipboardCopy className="w-3 h-3" />
              {copied ? 'Copied!' : 'Copy Suggestion'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Main Component ---

export function FRDReviewPanel({ review, onDismiss }: FRDReviewPanelProps) {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null)
  const grouped = groupBySeverity(review.issues)
  const severityOrder: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low']

  const highCount = grouped.high.length
  const mediumCount = grouped.medium.length
  const lowCount = grouped.low.length

  return (
    <div className="bg-bg-tertiary/50 border border-border-default rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-default bg-accent-purple/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileSearch className="w-3.5 h-3.5 text-accent-purple" />
            <h4 className="text-xs font-semibold text-accent-purple">FRD Review</h4>
          </div>
          <button
            onClick={onDismiss}
            className="text-text-tertiary hover:text-text-primary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-text-secondary mt-0.5 truncate">
          {review.frdTitle}
        </p>
      </div>

      {/* Quality summary */}
      <div className="px-3 py-2 border-b border-border-default flex items-center gap-3 text-[10px]">
        <span className="text-text-tertiary">
          Quality:{' '}
          <span className={cn('font-semibold capitalize', getQualityColor(review.overallQuality))}>
            {review.overallQuality}
          </span>
        </span>
        <span className="text-text-tertiary">
          Completeness:{' '}
          <span className="font-semibold text-text-primary">{review.estimatedCompleteness}%</span>
        </span>
      </div>

      {/* Issue count badges */}
      <div className="px-3 py-1.5 border-b border-border-default flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-text-tertiary mr-1">
          {review.issues.length} issue{review.issues.length !== 1 ? 's' : ''}:
        </span>
        {highCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-error/15 text-accent-error font-medium">
            {highCount} High
          </span>
        )}
        {mediumCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-warning/15 text-accent-warning font-medium">
            {mediumCount} Medium
          </span>
        )}
        {lowCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan font-medium">
            {lowCount} Low
          </span>
        )}
      </div>

      {/* Issues */}
      <div className="p-2 space-y-2 max-h-80 overflow-y-auto">
        {review.issues.length === 0 && (
          <div className="py-4 text-center">
            <p className="text-xs text-accent-success font-medium">No issues found!</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">This FRD looks well-structured.</p>
          </div>
        )}

        {severityOrder.map((severity) => {
          const issues = grouped[severity]
          if (issues.length === 0) return null
          const config = SEVERITY_CONFIG[severity]

          return (
            <div key={severity}>
              <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1 px-0.5', config.color)}>
                {config.label} Severity ({issues.length})
              </p>
              <div className="space-y-1">
                {issues.map((issue) => (
                  <ReviewIssueCard
                    key={issue.id}
                    issue={issue}
                    isExpanded={expandedIssueId === issue.id}
                    onToggle={() =>
                      setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)
                    }
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="px-3 py-2 border-t border-border-default">
        <p className="text-[10px] text-text-tertiary leading-relaxed">{review.summary}</p>
      </div>
    </div>
  )
}
