'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast-container'
import type { FeedbackSubmission, FeedbackCategory } from '@/types/database'

interface ConvertToWoModalProps {
  feedback: FeedbackSubmission
  projectId: string
  onClose: () => void
  onConverted: (updatedFeedback: FeedbackSubmission) => void
}

interface ProjectMember {
  user_id: string
  role: string
  display_name: string
  avatar_url: string | null
}

interface FeedbackMeta {
  browser?: string
  device?: string
  page_url?: string
  user_agent?: string
  viewport?: { width: number; height: number }
  [key: string]: unknown
}

function getPriorityFromCategory(category: FeedbackCategory): 'critical' | 'high' | 'medium' | 'low' {
  switch (category) {
    case 'bug':
    case 'performance':
      return 'high'
    case 'feature_request':
    case 'ux_issue':
      return 'medium'
    default:
      return 'low'
  }
}

function buildDescription(feedback: FeedbackSubmission): string {
  const submitter = feedback.submitter_name || feedback.submitter_email || 'Anonymous'
  const meta = (feedback.metadata || {}) as FeedbackMeta

  let desc = `## Original Feedback\n${feedback.content}\n\n## Context\n`
  desc += `- Submitted by: ${submitter}\n`
  desc += `- Browser: ${meta.browser || 'Unknown'}\n`
  desc += `- Device: ${meta.device || 'Unknown'}\n`
  desc += `- Page: ${meta.page_url || 'Unknown'}\n`
  desc += `- Received: ${new Date(feedback.created_at).toISOString()}\n`

  if (meta.viewport) {
    desc += `\n## Metadata\n- Viewport: ${meta.viewport.width} x ${meta.viewport.height}\n`
  }

  return desc
}

function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0] || ''
  // Take first sentence or first 80 chars, whichever is shorter
  const firstSentence = firstLine.split(/[.!?]/)[0] || firstLine
  return firstSentence.trim().slice(0, 120)
}

export function ConvertToWoModal({ feedback, projectId, onClose, onConverted }: ConvertToWoModalProps) {
  const { addToast } = useToast()
  const [title, setTitle] = useState(() => extractTitle(feedback.content))
  const [description, setDescription] = useState(() => buildDescription(feedback))
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>(
    () => getPriorityFromCategory(feedback.category)
  )
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch project members
  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch(`/api/projects/${projectId}/members`)
        if (res.ok) {
          const data = await res.json()
          setMembers(data.members || [])
        }
      } catch {
        // Members list is optional
      }
    }
    loadMembers()
  }, [projectId])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, isSubmitting])

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    if (title.trim().length < 3) newErrors.title = 'Title must be at least 3 characters'
    if (title.trim().length > 255) newErrors.title = 'Title must be 255 characters or less'
    if (description.trim().length < 10) newErrors.description = 'Description must be at least 10 characters'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [title, description])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/feedback/${feedback.id}/convert-to-wo`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            priority,
            assignee_id: assigneeId || null,
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to convert')
      }

      const data = await res.json()
      addToast(`Work order "${data.workOrder.title}" created`, 'success')

      if (data.feedback) {
        onConverted(data.feedback)
      }
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create work order'
      addToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [validate, projectId, feedback.id, title, description, priority, assigneeId, addToast, onConverted, onClose])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={isSubmitting ? undefined : onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-bg-secondary border border-border-default rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default flex-shrink-0">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-accent-cyan" />
              <h2 className="text-sm font-semibold text-text-primary">Convert to Work Order</h2>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Original feedback reference */}
            <div className="bg-accent-cyan/5 border border-accent-cyan/20 rounded-lg p-3">
              <p className="text-[10px] font-medium text-accent-cyan uppercase tracking-wider mb-1">Original Feedback</p>
              <p className="text-xs text-text-secondary line-clamp-3">{feedback.content}</p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Title <span className="text-accent-error">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                maxLength={255}
                placeholder="Summarize the work order"
                className={cn(
                  'w-full px-3 py-2 bg-bg-tertiary border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:border-accent-cyan transition-colors',
                  errors.title ? 'border-accent-error' : 'border-border-default'
                )}
              />
              <div className="flex items-center justify-between mt-1">
                {errors.title ? (
                  <p className="text-[10px] text-accent-error flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" />
                    {errors.title}
                  </p>
                ) : <span />}
                <p className="text-[10px] text-text-tertiary">{title.length}/255</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Description <span className="text-accent-error">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={8}
                placeholder="Work order description (Markdown)"
                className={cn(
                  'w-full px-3 py-2 bg-bg-tertiary border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:border-accent-cyan transition-colors font-mono text-xs',
                  errors.description ? 'border-accent-error' : 'border-border-default'
                )}
              />
              {errors.description && (
                <p className="text-[10px] text-accent-error flex items-center gap-1 mt-1">
                  <AlertCircle className="w-2.5 h-2.5" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Priority + Assignee row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as typeof priority)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan transition-colors"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Assignee</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan transition-colors"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags (read-only display) */}
            {feedback.tags && feedback.tags.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Tags from Feedback</label>
                <div className="flex flex-wrap gap-1.5">
                  {feedback.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default flex-shrink-0">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-accent-cyan text-bg-primary text-xs font-semibold rounded-lg hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Create Work Order
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
