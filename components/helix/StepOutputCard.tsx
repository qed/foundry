'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  ExternalLink,
  FolderOpen,
  BookOpen,
  FileText,
  CheckCircle2,
  File,
} from 'lucide-react'
import {
  generatePreview,
  formatRelativeTime,
  formatAbsoluteTime,
  getStepStatus,
  getEvidenceTypeLabel,
} from '@/lib/helix/step-output-utils'
import type { StepStatus } from '@/lib/helix/step-output-utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface StepOutputCardProps {
  stepKey: string
  stepName: string
  stepStatus: string
  evidenceData: Record<string, unknown> | null
  completedAt: string | null
  completedBy: string | null
  onViewDetails?: () => void
  variant?: 'compact' | 'detailed'
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function EvidenceIconBox({ evidenceType }: { evidenceType: string }) {
  const iconProps = { size: 20, className: 'text-accent-cyan' }
  let icon: React.ReactNode
  switch (evidenceType) {
    case 'documentation_inventory':
      icon = <FolderOpen {...iconProps} />
      break
    case 'knowledge_capture':
      icon = <BookOpen {...iconProps} />
      break
    case 'documentation_files':
      icon = <FileText {...iconProps} />
      break
    case 'documentation_verification':
      icon = <CheckCircle2 {...iconProps} />
      break
    default:
      icon = <File {...iconProps} />
  }
  return (
    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent-cyan/10 flex items-center justify-center">
      {icon}
    </div>
  )
}

function StatusBadge({ status }: { status: StepStatus }) {
  const config = {
    complete: {
      label: 'Complete',
      classes: 'bg-green-900/30 text-green-400 border-green-800/30',
    },
    in_progress: {
      label: 'In Progress',
      classes: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/30',
    },
    incomplete: {
      label: 'Locked',
      classes: 'bg-bg-tertiary/50 text-text-secondary border-bg-tertiary',
    },
  }

  const { label, classes } = config[status]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${classes}`}>
      {label}
    </span>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StepOutputCard({
  stepKey,
  stepName,
  stepStatus,
  evidenceData,
  completedAt,
  completedBy,
  onViewDetails,
  variant = 'compact',
}: StepOutputCardProps) {
  const [expanded, setExpanded] = useState(false)

  const status = useMemo(() => getStepStatus(stepStatus), [stepStatus])
  const evidenceType = (evidenceData?.evidence_type as string) ?? null

  const preview = useMemo(
    () => (evidenceData ? generatePreview(evidenceData) : null),
    [evidenceData]
  )

  const relativeTime = useMemo(
    () => (completedAt ? formatRelativeTime(completedAt) : null),
    [completedAt]
  )

  const absoluteTime = useMemo(
    () => (completedAt ? formatAbsoluteTime(completedAt) : null),
    [completedAt]
  )

  const typeLabel = useMemo(
    () => (evidenceType ? getEvidenceTypeLabel(evidenceType) : null),
    [evidenceType]
  )

  const handleToggle = useCallback(() => {
    if (variant === 'detailed') {
      setExpanded((prev) => !prev)
    }
  }, [variant])

  const borderClass =
    status === 'complete'
      ? 'border-2 border-green-800/40'
      : status === 'in_progress'
        ? 'border-2 border-dashed border-accent-cyan/40'
        : 'border border-bg-tertiary'

  return (
    <div
      className={`bg-bg-secondary rounded-lg ${borderClass} overflow-hidden transition-all duration-200 ${
        variant === 'detailed' ? 'cursor-pointer' : ''
      }`}
      onClick={handleToggle}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        {evidenceType && (
          <EvidenceIconBox evidenceType={evidenceType} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-accent-cyan">
              Step {stepKey}
            </span>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm font-medium text-text-primary truncate mt-0.5">
            {stepName}
          </p>
        </div>
        {variant === 'detailed' && (
          <ChevronDown
            size={16}
            className={`text-text-secondary transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="px-4 pb-2">
          <p className="text-xs text-text-secondary truncate">{preview}</p>
        </div>
      )}

      {/* Metadata */}
      {(relativeTime || completedBy) && (
        <div className="px-4 pb-3 flex items-center gap-3 text-xs text-text-secondary">
          {relativeTime && (
            <time dateTime={completedAt ?? undefined} title={absoluteTime ?? undefined}>
              {relativeTime}
            </time>
          )}
          {completedBy && (
            <>
              <span className="text-bg-tertiary">·</span>
              <span className="truncate">{completedBy}</span>
            </>
          )}
        </div>
      )}

      {/* Expanded Details (detailed variant only) */}
      {variant === 'detailed' && expanded && (
        <div className="border-t border-bg-tertiary/50 px-4 py-3 space-y-2">
          {typeLabel && (
            <p className="text-xs text-text-secondary">
              <span className="font-medium">Type:</span> {typeLabel}
            </p>
          )}
          {absoluteTime && (
            <p className="text-xs text-text-secondary">
              <span className="font-medium">Completed:</span> {absoluteTime}
            </p>
          )}
          {onViewDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails()
              }}
              className="flex items-center gap-1.5 text-xs text-accent-cyan hover:underline"
            >
              <ExternalLink size={12} />
              View Full Details
            </button>
          )}
        </div>
      )}

      {/* Compact View Details */}
      {variant === 'compact' && onViewDetails && status === 'complete' && (
        <div className="px-4 pb-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails()
            }}
            className="text-xs text-accent-cyan hover:underline flex items-center gap-1"
          >
            <ExternalLink size={12} />
            View Details
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Grid Layout ─────────────────────────────────────────────────────────────

interface StepOutputCardGridProps {
  children: React.ReactNode
  columns?: 2 | 3
}

export function StepOutputCardGrid({
  children,
  columns = 2,
}: StepOutputCardGridProps) {
  const gridClass =
    columns === 3
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      : 'grid grid-cols-1 md:grid-cols-2 gap-4'

  return <div className={gridClass}>{children}</div>
}
