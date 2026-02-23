'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast-container'
import { cn } from '@/lib/utils'
import { Check, X, FileText, ArrowRight } from 'lucide-react'

interface SuggestionItem {
  id: string
  blueprint_id: string
  blueprint_title: string
  blueprint_type: string | null
  blueprint_status: string | null
  suggestion_type: 'edit' | 'add_section' | 'remove_section'
  target_section: string | null
  current_content: string | null
  proposed_content: string | null
  reasoning: string | null
  is_approved: boolean
  applied: boolean
}

interface SuggestionDetail {
  id: string
  title: string
  description: string
  change_impact: string | null
  status: 'proposed' | 'approved' | 'rejected' | 'applied'
  trigger_blueprint_title: string | null
}

interface CrossDocReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  suggestionId: string | null
  onApplied: () => void
  onNavigateBlueprint: (blueprintId: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  edit: 'Edit',
  add_section: 'Add Section',
  remove_section: 'Remove Section',
}

const TYPE_COLORS: Record<string, string> = {
  edit: 'text-accent-cyan',
  add_section: 'text-accent-success',
  remove_section: 'text-accent-error',
}

export function CrossDocReviewModal({
  open,
  onOpenChange,
  projectId,
  suggestionId,
  onApplied,
  onNavigateBlueprint,
}: CrossDocReviewModalProps) {
  const [suggestion, setSuggestion] = useState<SuggestionDetail | null>(null)
  const [items, setItems] = useState<SuggestionItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [selectedTab, setSelectedTab] = useState(0)
  const { addToast } = useToast()

  useEffect(() => {
    if (!open || !suggestionId) return
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/cross-doc-suggestions/${suggestionId}`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        if (!cancelled) {
          setSuggestion(data.suggestion)
          setItems(data.items || [])
          setSelectedTab(0)
        }
      } catch {
        addToast('Failed to load suggestion details', 'error')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [open, suggestionId, projectId, addToast])

  const toggleItem = useCallback((itemId: string) => {
    setItems((prev) => prev.map((item) =>
      item.id === itemId ? { ...item, is_approved: !item.is_approved } : item
    ))
  }, [])

  const approveAll = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, is_approved: true })))
  }, [])

  const rejectAll = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, is_approved: false })))
  }, [])

  const handleApply = useCallback(async () => {
    if (!suggestionId) return
    const approvedItems = items.filter((i) => i.is_approved && !i.applied)
    if (approvedItems.length === 0) {
      addToast('No approved items to apply', 'warning')
      return
    }

    setIsApplying(true)
    try {
      // Save item approval states
      const itemUpdates = items.map((i) => ({ id: i.id, is_approved: i.is_approved }))
      await fetch(`/api/projects/${projectId}/cross-doc-suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', itemUpdates }),
      })

      // Apply approved items
      const res = await fetch(`/api/projects/${projectId}/cross-doc-suggestions/${suggestionId}/apply`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to apply')
      }

      const result = await res.json()
      addToast(`Applied ${result.applied} of ${result.total} changes`, 'success')
      onApplied()
      onOpenChange(false)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to apply changes', 'error')
    } finally {
      setIsApplying(false)
    }
  }, [suggestionId, items, projectId, addToast, onApplied, onOpenChange])

  const handleReject = useCallback(async () => {
    if (!suggestionId) return
    try {
      await fetch(`/api/projects/${projectId}/cross-doc-suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })
      addToast('Suggestion rejected', 'info')
      onApplied()
      onOpenChange(false)
    } catch {
      addToast('Failed to reject', 'error')
    }
  }, [suggestionId, projectId, addToast, onApplied, onOpenChange])

  const currentItem = items[selectedTab] || null
  const approvedCount = items.filter((i) => i.is_approved).length
  const isReadOnly = suggestion?.status === 'applied' || suggestion?.status === 'rejected'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? 'Loading...' : suggestion?.title || 'Cross-Document Suggestion'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : suggestion ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Description */}
            <div className="px-1 pb-3">
              <p className="text-xs text-text-secondary">{suggestion.description}</p>
              {suggestion.change_impact && (
                <p className="text-[10px] text-accent-warning mt-1">Impact: {suggestion.change_impact}</p>
              )}
              {suggestion.trigger_blueprint_title && (
                <p className="text-[10px] text-text-tertiary mt-1">
                  Triggered by: <span className="text-accent-cyan">{suggestion.trigger_blueprint_title}</span>
                </p>
              )}
            </div>

            {/* Blueprint tabs */}
            <div className="flex items-center gap-1 border-b border-border-default overflow-x-auto pb-0">
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedTab(idx)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                    selectedTab === idx
                      ? 'border-accent-purple text-accent-purple'
                      : 'border-transparent text-text-tertiary hover:text-text-secondary'
                  )}
                >
                  {!isReadOnly && (
                    <span className={cn('w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0',
                      item.is_approved
                        ? 'bg-accent-success/20 border-accent-success text-accent-success'
                        : 'border-border-default text-transparent'
                    )}>
                      <Check className="w-2 h-2" />
                    </span>
                  )}
                  {item.applied && (
                    <span className="text-[8px] text-accent-purple">applied</span>
                  )}
                  <FileText className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{item.blueprint_title}</span>
                </button>
              ))}
            </div>

            {/* Selected item content */}
            {currentItem && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Item header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-medium', TYPE_COLORS[currentItem.suggestion_type])}>
                      {TYPE_LABELS[currentItem.suggestion_type]}
                    </span>
                    {currentItem.target_section && (
                      <span className="text-[10px] text-text-tertiary">
                        Section: {currentItem.target_section}
                      </span>
                    )}
                    {currentItem.blueprint_status && (
                      <span className="text-[9px] text-text-tertiary border border-border-default rounded px-1.5 py-0.5">
                        {currentItem.blueprint_status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isReadOnly && (
                      <button
                        onClick={() => toggleItem(currentItem.id)}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                          currentItem.is_approved
                            ? 'bg-accent-success/10 text-accent-success'
                            : 'bg-bg-tertiary text-text-tertiary'
                        )}
                      >
                        {currentItem.is_approved ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {currentItem.is_approved ? 'Approved' : 'Excluded'}
                      </button>
                    )}
                    <button
                      onClick={() => onNavigateBlueprint(currentItem.blueprint_id)}
                      className="text-[10px] text-accent-cyan hover:underline flex items-center gap-0.5"
                    >
                      Open <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Reasoning */}
                {currentItem.reasoning && (
                  <div className="p-2.5 bg-accent-purple/5 border border-accent-purple/20 rounded-lg">
                    <p className="text-[10px] font-medium text-accent-purple mb-1">Reasoning</p>
                    <p className="text-xs text-text-secondary">{currentItem.reasoning}</p>
                  </div>
                )}

                {/* Content diff view */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Current */}
                  {currentItem.current_content && (
                    <div>
                      <p className="text-[10px] font-medium text-text-tertiary mb-1.5">Current Content</p>
                      <div className="p-3 bg-bg-primary border border-border-default rounded-lg max-h-[300px] overflow-y-auto">
                        <pre className="text-[10px] text-text-secondary whitespace-pre-wrap font-mono">{currentItem.current_content}</pre>
                      </div>
                    </div>
                  )}
                  {/* Proposed */}
                  {currentItem.proposed_content && (
                    <div>
                      <p className="text-[10px] font-medium text-accent-success mb-1.5">Proposed Content</p>
                      <div className="p-3 bg-accent-success/5 border border-accent-success/20 rounded-lg max-h-[300px] overflow-y-auto">
                        <pre className="text-[10px] text-text-secondary whitespace-pre-wrap font-mono">{currentItem.proposed_content}</pre>
                      </div>
                    </div>
                  )}
                  {/* Full width if only proposed (add_section) */}
                  {!currentItem.current_content && currentItem.proposed_content && (
                    <div /> // Grid placeholder — proposed already rendered above
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          {!isReadOnly && suggestion?.status === 'proposed' && (
            <>
              <div className="flex items-center gap-2 mr-auto">
                <button onClick={approveAll} className="text-[10px] text-accent-success hover:underline">
                  Select All
                </button>
                <button onClick={rejectAll} className="text-[10px] text-text-tertiary hover:underline">
                  Deselect All
                </button>
                <span className="text-[10px] text-text-tertiary">
                  {approvedCount}/{items.length} selected
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReject}>
                Reject All
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApply}
                isLoading={isApplying}
                disabled={approvedCount === 0}
              >
                Apply {approvedCount > 0 ? `(${approvedCount})` : ''}
              </Button>
            </>
          )}
          {isReadOnly && (
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
