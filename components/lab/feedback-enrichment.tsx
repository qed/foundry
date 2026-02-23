'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Layers,
  GitBranch,
  MessageSquare,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import type { FeedbackSubmission } from '@/types/database'
import type { FeedbackEnrichment } from '@/lib/agent/enrich-feedback'

interface FeedbackEnrichmentSectionProps {
  feedback: FeedbackSubmission
  projectId: string
  onUpdate: (updated: FeedbackSubmission) => void
}

export function FeedbackEnrichmentSection({
  feedback,
  projectId,
  onUpdate,
}: FeedbackEnrichmentSectionProps) {
  const [isEnriching, setIsEnriching] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const enrichment = feedback.enrichment as FeedbackEnrichment | null

  const handleEnrich = useCallback(async () => {
    if (isEnriching) return
    setIsEnriching(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/feedback/${feedback.id}/enrich`,
        { method: 'POST' }
      )
      if (!res.ok) throw new Error('Failed to enrich')
      const updated = await res.json()
      onUpdate(updated)
    } catch (err) {
      console.error('Enrichment error:', err)
    } finally {
      setIsEnriching(false)
    }
  }, [feedback.id, projectId, onUpdate, isEnriching])

  const toggleSection = useCallback(
    (section: string) => {
      setExpandedSection((prev) => (prev === section ? null : section))
    },
    []
  )

  // No enrichment yet — show button
  if (!enrichment) {
    return (
      <section>
        <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-accent-cyan" />
          AI Enrichment
        </h3>
        <button
          onClick={handleEnrich}
          disabled={isEnriching}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
            isEnriching
              ? 'bg-accent-cyan/5 text-accent-cyan/60 cursor-wait'
              : 'bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20'
          )}
        >
          <Sparkles className={cn('w-3.5 h-3.5', isEnriching && 'animate-pulse')} />
          {isEnriching ? 'Analyzing feedback...' : 'Enrich with AI'}
        </button>
      </section>
    )
  }

  // Enrichment exists — show results
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-accent-cyan" />
          AI Enrichment
        </h3>
        <div className="flex items-center gap-2">
          {enrichment.enrichedAt && (
            <span className="text-[9px] text-text-tertiary">
              {timeAgo(enrichment.enrichedAt)}
            </span>
          )}
          <button
            onClick={handleEnrich}
            disabled={isEnriching}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-tertiary hover:text-accent-cyan hover:bg-accent-cyan/5 transition-colors disabled:opacity-50"
            title="Re-analyze"
          >
            <RotateCcw className={cn('w-3 h-3', isEnriching && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="bg-accent-cyan/5 border border-accent-cyan/10 rounded-lg p-3 space-y-3">
        {/* Duplicate warning */}
        {enrichment.duplicateRisk?.isDuplicate && (
          <div className="flex items-start gap-2 bg-accent-warning/10 border border-accent-warning/20 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 text-accent-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-accent-warning">
                Potential Duplicate
              </p>
              <p className="text-[10px] text-text-secondary mt-0.5">
                This appears similar to{' '}
                {enrichment.duplicateRisk.relatedFeedbackIds.length} other
                submission
                {enrichment.duplicateRisk.relatedFeedbackIds.length !== 1
                  ? 's'
                  : ''}
                .
                {enrichment.duplicateRisk.confidence > 90 &&
                  ' Very likely a duplicate.'}
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        {enrichment.summary && (
          <div>
            <p className="text-xs text-text-primary italic leading-relaxed">
              &ldquo;{enrichment.summary}&rdquo;
            </p>
          </div>
        )}

        {/* Key Issues — collapsible */}
        {enrichment.keyIssues?.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('issues')}
              className="flex items-center gap-1.5 text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              {expandedSection === 'issues' ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              Key Issues ({enrichment.keyIssues.length})
            </button>
            {expandedSection === 'issues' && (
              <ul className="mt-1.5 space-y-1 ml-4">
                {enrichment.keyIssues.map((issue, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-text-secondary flex items-start gap-1.5"
                  >
                    <span className="text-accent-cyan mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Affected Components */}
        {enrichment.affectedComponents?.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('components')}
              className="flex items-center gap-1.5 text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              {expandedSection === 'components' ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <Layers className="w-3 h-3" />
              Affected Components ({enrichment.affectedComponents.length})
            </button>
            {expandedSection === 'components' && (
              <div className="mt-1.5 flex flex-wrap gap-1 ml-4">
                {enrichment.affectedComponents.map((comp) => (
                  <span
                    key={comp}
                    className="text-[10px] text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggested Features — collapsible */}
        {enrichment.suggestedFeatures?.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('features')}
              className="flex items-center gap-1.5 text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              {expandedSection === 'features' ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <GitBranch className="w-3 h-3" />
              Related Features ({enrichment.suggestedFeatures.length})
            </button>
            {expandedSection === 'features' && (
              <div className="mt-1.5 space-y-1.5 ml-4">
                {enrichment.suggestedFeatures.map((feat) => (
                  <div key={feat.id} className="text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary font-medium">
                        {feat.name}
                      </span>
                      <span className="text-[9px] text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded-full">
                        {feat.matchScore}%
                      </span>
                    </div>
                    <p className="text-[10px] text-text-tertiary mt-0.5">
                      {feat.matchReason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Related Feedback — collapsible */}
        {enrichment.relatedFeedback?.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('related')}
              className="flex items-center gap-1.5 text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              {expandedSection === 'related' ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <MessageSquare className="w-3 h-3" />
              Related Feedback ({enrichment.relatedFeedback.length})
            </button>
            {expandedSection === 'related' && (
              <div className="mt-1.5 space-y-1.5 ml-4">
                {enrichment.relatedFeedback.map((related) => (
                  <div
                    key={related.id}
                    className="text-[11px] bg-bg-tertiary/50 rounded p-2"
                  >
                    <p className="text-text-secondary line-clamp-2">
                      {related.contentPreview || 'No preview available'}
                      {related.contentPreview &&
                        related.contentPreview.length >= 100 &&
                        '...'}
                    </p>
                    <span className="text-[9px] text-accent-cyan mt-1 inline-block">
                      {related.similarity}% similar
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
