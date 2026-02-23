'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  FileText,
  GitBranch,
  Eye,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast-container'
import { Button } from '@/components/ui/button'
import type {
  ConversionSuggestion,
  ConversionSuggestionsResult,
} from '@/lib/agent/conversion-suggestions'

interface ConversionSuggestionsPanelProps {
  projectId: string
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-accent-error/15 text-accent-error',
  high: 'bg-accent-warning/15 text-accent-warning',
  medium: 'bg-accent-cyan/15 text-accent-cyan',
  low: 'bg-text-tertiary/15 text-text-tertiary',
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  work_order: { label: 'Work Order', icon: FileText, color: 'text-accent-cyan' },
  feature: { label: 'Feature', icon: GitBranch, color: 'text-accent-purple' },
  monitor: { label: 'Monitor', icon: Eye, color: 'text-text-tertiary' },
}

const TREND_ICONS = {
  increasing: TrendingUp,
  stable: Minus,
  decreasing: TrendingDown,
}

const TREND_COLORS = {
  increasing: 'text-accent-error',
  stable: 'text-text-tertiary',
  decreasing: 'text-accent-success',
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature_request: 'Feature Request',
  ux_issue: 'UX Issue',
  performance: 'Performance',
  other: 'Other',
  uncategorized: 'Uncategorized',
}

export function ConversionSuggestionsPanel({
  projectId,
}: ConversionSuggestionsPanelProps) {
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ConversionSuggestionsResult | null>(null)
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set())

  const handleGenerate = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/feedback/conversion-suggestions`,
        { method: 'POST' }
      )
      if (!res.ok) throw new Error('Failed to generate suggestions')
      const data = await res.json()
      setResult(data)
    } catch (err) {
      addToast('Failed to generate suggestions', 'error')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, addToast])

  const handleConvert = useCallback(
    async (suggestion: ConversionSuggestion) => {
      const feedbackId = suggestion.feedbackIds[0]
      if (!feedbackId) return

      const key = `${feedbackId}-${suggestion.type}`
      setConvertingIds((prev) => new Set([...prev, key]))

      try {
        const endpoint =
          suggestion.type === 'feature'
            ? `/api/projects/${projectId}/feedback/${feedbackId}/convert-to-feature`
            : `/api/projects/${projectId}/feedback/${feedbackId}/convert-to-wo`

        const body =
          suggestion.type === 'feature'
            ? {
                title: suggestion.title,
                description: suggestion.description,
              }
            : {
                title: suggestion.title,
                description: suggestion.description,
                priority: suggestion.priority,
              }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (res.status === 409) {
          addToast('This feedback has already been converted', 'warning')
          return
        }
        if (!res.ok) throw new Error('Conversion failed')

        const typeLabel =
          suggestion.type === 'feature' ? 'feature' : 'work order'
        addToast(
          `Created ${typeLabel}: ${suggestion.title}`,
          'success'
        )
      } catch (err) {
        addToast('Conversion failed', 'error')
        console.error(err)
      } finally {
        setConvertingIds((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    },
    [projectId, addToast]
  )

  const handleConvertAll = useCallback(async () => {
    if (!result) return
    const actionable = result.recommendations.filter(
      (r) => r.type !== 'monitor' && r.feedbackIds.length > 0
    )
    for (const suggestion of actionable) {
      await handleConvert(suggestion)
    }
  }, [result, handleConvert])

  // Initial state — no suggestions yet
  if (!result && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <Sparkles className="w-12 h-12 text-accent-purple/40 mb-4" />
        <h2 className="text-sm font-semibold text-text-primary mb-1">
          Conversion Suggestions
        </h2>
        <p className="text-xs text-text-tertiary text-center max-w-xs mb-4">
          AI analyzes your feedback to recommend which items should become work
          orders, features, or be monitored.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={handleGenerate}
          isLoading={isLoading}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Generate Suggestions
        </Button>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-accent-purple animate-spin mb-3" />
        <p className="text-xs text-text-secondary">
          Analyzing feedback patterns...
        </p>
      </div>
    )
  }

  if (!result) return null

  const actionableCount = result.recommendations.filter(
    (r) => r.type !== 'monitor'
  ).length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-default flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
          <span className="text-xs font-medium text-text-primary">
            Suggestions
          </span>
          <span className="text-[10px] text-text-tertiary bg-bg-tertiary rounded-full px-1.5 py-0.5">
            {result.recommendations.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {actionableCount > 0 && (
            <button
              onClick={handleConvertAll}
              className="text-[10px] text-accent-cyan hover:text-accent-cyan/80 transition-colors"
            >
              Convert all ({actionableCount})
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl space-y-5">
          {/* Summary */}
          {result.summary && (
            <p className="text-xs text-text-secondary italic leading-relaxed">
              {result.summary}
            </p>
          )}

          {/* Trends */}
          {result.trends.length > 0 && (
            <section>
              <h3 className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
                Category Trends (7-day)
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.trends.map((trend) => {
                  const TrendIcon = TREND_ICONS[trend.trend]
                  return (
                    <div
                      key={trend.category}
                      className="flex items-center gap-1.5 bg-bg-tertiary/50 rounded-lg px-2.5 py-1.5"
                    >
                      <TrendIcon
                        className={cn(
                          'w-3 h-3',
                          TREND_COLORS[trend.trend]
                        )}
                      />
                      <span className="text-[10px] text-text-secondary">
                        {CATEGORY_LABELS[trend.category] || trend.category}
                      </span>
                      <span className="text-[10px] text-text-tertiary">
                        {trend.thisWeek}
                        {trend.lastWeek > 0 && (
                          <span className="ml-0.5">
                            ({trend.trend === 'increasing' ? '+' : ''}
                            {trend.thisWeek - trend.lastWeek})
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <section>
              <h3 className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
                Recommendations
              </h3>
              <div className="space-y-3">
                {result.recommendations.map((rec, i) => {
                  const typeConfig = TYPE_CONFIG[rec.type] || TYPE_CONFIG.monitor
                  const TypeIcon = typeConfig.icon
                  const feedbackId = rec.feedbackIds[0]
                  const convertKey = `${feedbackId}-${rec.type}`
                  const isConverting = convertingIds.has(convertKey)

                  return (
                    <div
                      key={i}
                      className="border border-border-default rounded-lg p-3 space-y-2"
                    >
                      {/* Title row */}
                      <div className="flex items-start gap-2">
                        <TypeIcon
                          className={cn(
                            'w-4 h-4 flex-shrink-0 mt-0.5',
                            typeConfig.color
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-text-primary">
                            {rec.title}
                          </h4>
                          <p className="text-[11px] text-text-secondary mt-0.5">
                            {rec.description}
                          </p>
                        </div>
                      </div>

                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1.5 ml-6">
                        <span
                          className={cn(
                            'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                            PRIORITY_STYLES[rec.priority]
                          )}
                        >
                          {rec.priority}
                        </span>
                        <span className="text-[9px] text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded-full">
                          Effort: {rec.effort.toUpperCase()}
                        </span>
                        <span className="text-[9px] text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded-full">
                          Impact: {rec.impact}
                        </span>
                        <span className="text-[9px] text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded-full">
                          {rec.feedbackIds.length} item
                          {rec.feedbackIds.length !== 1 ? 's' : ''}
                        </span>
                        {rec.suggestedParentFeature && (
                          <span className="text-[9px] text-accent-purple bg-accent-purple/10 px-1.5 py-0.5 rounded-full">
                            → {rec.suggestedParentFeature}
                          </span>
                        )}
                      </div>

                      {/* Reasoning */}
                      <p className="text-[10px] text-text-tertiary ml-6">
                        {rec.reasoning}
                      </p>

                      {/* Action buttons */}
                      {rec.type !== 'monitor' && feedbackId && (
                        <div className="ml-6">
                          <button
                            onClick={() => handleConvert(rec)}
                            disabled={isConverting}
                            className={cn(
                              'flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-colors',
                              rec.type === 'feature'
                                ? 'bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20'
                                : 'bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20',
                              isConverting && 'opacity-50 cursor-wait'
                            )}
                          >
                            {isConverting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ArrowRight className="w-3 h-3" />
                            )}
                            {isConverting
                              ? 'Converting...'
                              : rec.type === 'feature'
                                ? 'Convert to Feature'
                                : 'Convert to Work Order'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Duplicate groups */}
          {result.duplicateGroups.length > 0 && (
            <section>
              <h3 className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-accent-warning" />
                Potential Duplicates
              </h3>
              <div className="space-y-2">
                {result.duplicateGroups.map((group, i) => (
                  <div
                    key={i}
                    className="bg-accent-warning/5 border border-accent-warning/10 rounded-lg p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-primary font-medium">
                        {group.title}
                      </span>
                      <span className="text-[9px] text-accent-warning">
                        {group.similarity}% similar
                      </span>
                    </div>
                    <p className="text-[10px] text-text-tertiary mt-1">
                      {group.feedbackIds.length} items — consider consolidating
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
