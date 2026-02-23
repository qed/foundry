'use client'

import { useState, useEffect, useCallback } from 'react'
import { GitCompare, ChevronDown, ChevronRight, ExternalLink, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn, timeAgo } from '@/lib/utils'

interface SuggestionSummary {
  id: string
  title: string
  description: string
  change_impact: string | null
  status: 'proposed' | 'approved' | 'rejected' | 'applied'
  trigger_blueprint_id: string | null
  trigger_blueprint_title: string | null
  item_count: number
  created_at: string
}

interface CrossDocSuggestionsPanelProps {
  projectId: string
  onClose: () => void
  onReview: (suggestionId: string) => void
  onNavigateBlueprint: (blueprintId: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  proposed: 'text-accent-cyan',
  approved: 'text-accent-success',
  rejected: 'text-text-tertiary',
  applied: 'text-accent-purple',
}

const STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposed',
  approved: 'Approved',
  rejected: 'Rejected',
  applied: 'Applied',
}

export function CrossDocSuggestionsPanel({ projectId, onClose, onReview, onNavigateBlueprint }: CrossDocSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<SuggestionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchSuggestions = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`/api/projects/${projectId}/cross-doc-suggestions${params}`)
      if (!res.ok) return
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch {
      // Silently ignore
    } finally {
      setIsLoading(false)
    }
  }, [projectId, filter])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const handleReject = useCallback(async (suggestionId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/cross-doc-suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })
      if (res.ok) {
        setSuggestions((prev) => prev.map((s) => s.id === suggestionId ? { ...s, status: 'rejected' as const } : s))
      }
    } catch {
      // Silently ignore
    }
  }, [projectId])

  const filters = ['all', 'proposed', 'approved', 'applied', 'rejected']

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-accent-purple" />
          <h3 className="text-sm font-medium text-text-primary">Cross-Doc Suggestions</h3>
        </div>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border-default overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-2 py-1 text-[10px] font-medium rounded transition-colors flex-shrink-0',
              filter === f
                ? 'bg-accent-purple/10 text-accent-purple'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
            )}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <GitCompare className="w-8 h-8 text-text-tertiary mb-2" />
            <p className="text-xs text-text-tertiary">No cross-document suggestions.</p>
            <p className="text-[10px] text-text-tertiary mt-1">
              Use the agent to analyze blueprints for cross-document consistency.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {suggestions.map((s) => {
              const isExpanded = expandedId === s.id
              return (
                <div key={s.id} className="glass-panel rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-bg-tertiary/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-text-tertiary mt-0.5 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-text-tertiary mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{s.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn('text-[9px] font-medium', STATUS_COLORS[s.status])}>
                          {STATUS_LABELS[s.status]}
                        </span>
                        <span className="text-[9px] text-text-tertiary">
                          {s.item_count} blueprint{s.item_count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[9px] text-text-tertiary">{timeAgo(s.created_at)}</span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border-default pt-2">
                      <p className="text-[10px] text-text-secondary mb-2">{s.description}</p>
                      {s.change_impact && (
                        <p className="text-[10px] text-accent-warning mb-2">Impact: {s.change_impact}</p>
                      )}
                      {s.trigger_blueprint_title && (
                        <button
                          onClick={() => s.trigger_blueprint_id && onNavigateBlueprint(s.trigger_blueprint_id)}
                          className="flex items-center gap-1 text-[10px] text-accent-cyan hover:underline mb-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Triggered by: {s.trigger_blueprint_title}
                        </button>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        {s.status === 'proposed' && (
                          <>
                            <Button size="sm" variant="primary" onClick={() => onReview(s.id)}>
                              <Check className="w-3 h-3 mr-1" />
                              Review
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleReject(s.id)}>
                              <Trash2 className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {s.status === 'approved' && (
                          <Button size="sm" variant="primary" onClick={() => onReview(s.id)}>
                            Review & Apply
                          </Button>
                        )}
                        {(s.status === 'applied' || s.status === 'rejected') && (
                          <Button size="sm" variant="ghost" onClick={() => onReview(s.id)}>
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
