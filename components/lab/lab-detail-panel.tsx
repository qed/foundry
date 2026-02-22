'use client'

import { useState, useCallback } from 'react'
import {
  MessageSquare,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Archive,
  X,
  Plus,
  Gauge,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import type { FeedbackSubmission, FeedbackStatus, FeedbackCategory } from '@/types/database'

interface LabDetailPanelProps {
  feedback: FeedbackSubmission | null
  projectId: string
  onUpdate: (updated: FeedbackSubmission) => void
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

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'ux_issue', label: 'UX Issue' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
  { value: 'uncategorized', label: 'Uncategorized' },
]

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'converted', label: 'Converted' },
  { value: 'archived', label: 'Archived' },
]

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
}

interface FeedbackMetadata {
  browser?: string
  device?: string
  page_url?: string
  user_agent?: string
  viewport?: { width: number; height: number }
  timestamp_client?: number
  [key: string]: unknown
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'bg-accent-error'
  if (score >= 50) return 'bg-accent-warning'
  if (score >= 25) return 'bg-accent-cyan'
  return 'bg-accent-success'
}

export function LabDetailPanel({ feedback, projectId, onUpdate }: LabDetailPanelProps) {
  const [copied, setCopied] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [uaExpanded, setUaExpanded] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const patchFeedback = useCallback(async (updates: Record<string, unknown>) => {
    if (!feedback) return
    setIsSaving(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/feedback/${feedback.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      )
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      onUpdate(updated)
    } catch (err) {
      console.error('Error updating feedback:', err)
    } finally {
      setIsSaving(false)
    }
  }, [feedback, projectId, onUpdate])

  const handleCopy = useCallback(async () => {
    if (!feedback) return
    await navigator.clipboard.writeText(feedback.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [feedback])

  const handleAddTag = useCallback(() => {
    if (!feedback || !newTag.trim()) return
    const currentTags = feedback.tags || []
    if (currentTags.includes(newTag.trim())) {
      setNewTag('')
      return
    }
    patchFeedback({ tags: [...currentTags, newTag.trim()] })
    setNewTag('')
  }, [feedback, newTag, patchFeedback])

  const handleRemoveTag = useCallback((tag: string) => {
    if (!feedback) return
    const currentTags = feedback.tags || []
    patchFeedback({ tags: currentTags.filter((t) => t !== tag) })
  }, [feedback, patchFeedback])

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

  const meta = (feedback.metadata || {}) as FeedbackMetadata

  return (
    <div className="h-full flex flex-col">
      {/* Detail header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-default flex-shrink-0">
        {/* Status dropdown */}
        <div className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            disabled={isSaving}
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors',
              STATUS_STYLES[feedback.status] || '',
              'hover:opacity-80'
            )}
          >
            {STATUS_LABELS[feedback.status] || feedback.status}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          {statusOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-20 bg-bg-secondary border border-border-default rounded-lg shadow-lg py-1 min-w-[120px]">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      patchFeedback({ status: opt.value })
                      setStatusOpen(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs transition-colors',
                      feedback.status === opt.value
                        ? 'text-accent-cyan bg-accent-cyan/5'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    )}
                  >
                    <span className={cn(
                      'inline-block w-1.5 h-1.5 rounded-full mr-2',
                      opt.value === 'new' && 'bg-accent-cyan',
                      opt.value === 'triaged' && 'bg-accent-warning',
                      opt.value === 'converted' && 'bg-accent-success',
                      opt.value === 'archived' && 'bg-text-tertiary',
                    )} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Category dropdown */}
        <div className="relative">
          <button
            onClick={() => setCategoryOpen(!categoryOpen)}
            disabled={isSaving}
            className="flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {CATEGORY_OPTIONS.find((c) => c.value === feedback.category)?.label || feedback.category}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          {categoryOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setCategoryOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-20 bg-bg-secondary border border-border-default rounded-lg shadow-lg py-1 min-w-[140px]">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      patchFeedback({ category: opt.value })
                      setCategoryOpen(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs transition-colors',
                      feedback.category === opt.value
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

        <div className="flex-1" />

        {/* Priority score */}
        {feedback.score != null && (
          <span className="flex items-center gap-1.5 text-xs text-text-secondary" title={`Priority score: ${feedback.score}/100`}>
            <Gauge className="w-3 h-3" />
            <span className="font-medium text-text-primary">{feedback.score}</span>
          </span>
        )}

        {/* Archive button */}
        {feedback.status !== 'archived' && (
          <button
            onClick={() => patchFeedback({ status: 'archived' })}
            disabled={isSaving}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-tertiary hover:text-accent-error hover:bg-accent-error/5 transition-colors"
            title="Archive this feedback"
          >
            <Archive className="w-3 h-3" />
            Archive
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">

          {/* ── Full Content Section ──────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Feedback</h3>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
                title="Copy feedback text"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-accent-success" />
                    <span className="text-accent-success">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-bg-tertiary/50 border border-border-default rounded-lg p-4">
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words">
                {feedback.content}
              </p>
            </div>
          </section>

          {/* ── Priority Score Bar ────────────────────────────── */}
          {feedback.score != null && (
            <section>
              <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Priority Score</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-bg-tertiary rounded-full h-2">
                  <div
                    className={cn('h-2 rounded-full transition-all', getScoreColor(feedback.score))}
                    style={{ width: `${feedback.score}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-text-primary min-w-[3rem] text-right">
                  {feedback.score}/100
                </span>
              </div>
              <p className="text-[10px] text-text-tertiary mt-1">AI-assigned priority score</p>
            </section>
          )}

          {/* ── Tags ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Tags</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {(feedback.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[10px] text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded-full group"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    disabled={isSaving}
                    className="opacity-0 group-hover:opacity-100 hover:text-accent-error transition-opacity"
                    title={`Remove tag "${tag}"`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              {/* Inline add tag */}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag()
                  }}
                  placeholder="Add tag..."
                  className="w-20 text-[10px] bg-transparent border-b border-border-default text-text-secondary placeholder:text-text-tertiary/50 focus:border-accent-cyan focus:outline-none py-0.5 px-1 transition-colors"
                />
                {newTag.trim() && (
                  <button
                    onClick={handleAddTag}
                    disabled={isSaving}
                    className="text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ── Submitter Info ────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Submitted By</h3>
            {feedback.submitter_name || feedback.submitter_email ? (
              <div className="space-y-1">
                {feedback.submitter_name && (
                  <p className="text-sm text-text-primary">{feedback.submitter_name}</p>
                )}
                {feedback.submitter_email && (
                  <a
                    href={`mailto:${feedback.submitter_email}`}
                    className="text-xs text-accent-cyan hover:underline"
                  >
                    {feedback.submitter_email}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary italic">Anonymous</p>
            )}
          </section>

          {/* ── Metadata Section ──────────────────────────────── */}
          {Object.keys(meta).length > 0 && (
            <section>
              <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Details</h3>
              <div className="space-y-2.5 text-xs">
                {/* Browser */}
                {meta.browser && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3 text-text-tertiary flex-shrink-0" />
                    <span className="text-text-tertiary">Browser</span>
                    <span className="text-text-secondary">{meta.browser}</span>
                  </div>
                )}

                {/* Device */}
                {meta.device && (() => {
                  const DeviceIcon = DEVICE_ICONS[meta.device] || Monitor
                  return (
                    <div className="flex items-center gap-2">
                      <DeviceIcon className="w-3 h-3 text-text-tertiary flex-shrink-0" />
                      <span className="text-text-tertiary">Device</span>
                      <span className="text-text-secondary capitalize">{meta.device}</span>
                    </div>
                  )
                })()}

                {/* Viewport */}
                {meta.viewport && (
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3 h-3 text-text-tertiary flex-shrink-0" />
                    <span className="text-text-tertiary">Viewport</span>
                    <span className="text-text-secondary">{meta.viewport.width} x {meta.viewport.height}</span>
                  </div>
                )}

                {/* Page URL */}
                {meta.page_url && (
                  <div className="flex items-start gap-2">
                    <ExternalLink className="w-3 h-3 text-text-tertiary flex-shrink-0 mt-0.5" />
                    <span className="text-text-tertiary flex-shrink-0">Page</span>
                    <a
                      href={meta.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-cyan hover:underline break-all"
                      title={meta.page_url}
                    >
                      {(() => {
                        try { return new URL(meta.page_url).hostname } catch { return meta.page_url }
                      })()}
                    </a>
                  </div>
                )}

                {/* Client timestamp */}
                {meta.timestamp_client && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 flex-shrink-0" />
                    <span className="text-text-tertiary">Client time</span>
                    <span className="text-text-secondary">{new Date(meta.timestamp_client).toLocaleString()}</span>
                  </div>
                )}

                {/* User-Agent (collapsible) */}
                {meta.user_agent && (
                  <div>
                    <button
                      onClick={() => setUaExpanded(!uaExpanded)}
                      className="flex items-center gap-1 text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      <ChevronDown className={cn('w-3 h-3 transition-transform', uaExpanded && 'rotate-180')} />
                      User Agent
                    </button>
                    {uaExpanded && (
                      <p className="text-[10px] text-text-tertiary mt-1.5 font-mono bg-bg-tertiary/50 p-2 rounded break-all">
                        {meta.user_agent}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Timestamps ───────────────────────────────────── */}
          <section className="text-[10px] text-text-tertiary space-y-1">
            <p>Received: {new Date(feedback.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(feedback.updated_at).toLocaleString()}</p>
          </section>

          {/* ── Conversion Actions ────────────────────────────── */}
          <section>
            <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Actions</h3>
            <div className="flex items-center gap-2">
              {feedback.converted_to_work_order_id ? (
                <span className="text-[10px] bg-accent-success/10 text-accent-success px-2 py-1 rounded-lg">
                  Converted to work order
                </span>
              ) : (
                <button
                  disabled
                  className="px-3 py-1.5 bg-accent-cyan/10 text-accent-cyan rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
                >
                  Convert to Work Order
                </button>
              )}
              {feedback.converted_to_feature_id ? (
                <span className="text-[10px] bg-accent-success/10 text-accent-success px-2 py-1 rounded-lg">
                  Converted to feature
                </span>
              ) : (
                <button
                  disabled
                  className="px-3 py-1.5 bg-accent-purple/10 text-accent-purple rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
                >
                  Convert to Feature
                </button>
              )}
            </div>
            <p className="text-[10px] text-text-tertiary mt-1.5">
              Conversion actions coming in Phase 088 &amp; 089
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
