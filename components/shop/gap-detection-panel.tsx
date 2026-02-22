'use client'

import { useState, useCallback } from 'react'
import {
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Info,
  Plus,
  Loader2,
  X,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeatureLevel } from '@/types/database'

// --- Types ---

export interface SuggestedGapNode {
  title: string
  description: string
  level: FeatureLevel | string
  suggestedParent: string | null
}

export interface Gap {
  id: string
  severity: 'low' | 'medium' | 'high'
  briefQuote: string
  briefSection: string
  coverage: 'none' | 'partial'
  description: string
  suggestedNodes: SuggestedGapNode[]
}

export interface GapDetectionResult {
  treeNodeCount: number
  coveragePercent: number
  gaps: Gap[]
  summary: string
}

interface GapDetectionPanelProps {
  result: GapDetectionResult
  projectId: string
  onNodesCreated?: () => void
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

const VALID_LEVELS: FeatureLevel[] = ['epic', 'feature', 'sub_feature', 'task']

function groupBySeverity(gaps: Gap[]): Record<string, Gap[]> {
  const groups: Record<string, Gap[]> = { high: [], medium: [], low: [] }
  for (const gap of gaps) {
    const key = gap.severity in groups ? gap.severity : 'low'
    groups[key].push(gap)
  }
  return groups
}

function getCoverageColor(percent: number): string {
  if (percent >= 80) return 'text-accent-success'
  if (percent >= 50) return 'text-accent-warning'
  return 'text-accent-error'
}

// --- Gap Card ---

function GapCard({
  gap,
  isExpanded,
  onToggle,
  onCreateNodes,
  isCreating,
  isCreated,
}: {
  gap: Gap
  isExpanded: boolean
  onToggle: () => void
  onCreateNodes: () => void
  isCreating: boolean
  isCreated: boolean
}) {
  const config = SEVERITY_CONFIG[gap.severity] || SEVERITY_CONFIG.low
  const SeverityIcon = config.icon
  const nodeCount = gap.suggestedNodes?.length || 0

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
          <p className="text-xs text-text-primary leading-relaxed">{gap.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-text-tertiary">{gap.briefSection}</span>
            <span className="text-[10px] text-text-tertiary">
              &middot; {gap.coverage === 'none' ? 'Not covered' : 'Partially covered'}
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-2.5 pb-2.5 pt-0 ml-6 space-y-2">
          {/* Brief quote */}
          <div className="bg-bg-primary/50 border-l-2 border-text-tertiary px-2 py-1.5 rounded-r">
            <p className="text-[10px] text-text-tertiary italic leading-relaxed">
              &ldquo;{gap.briefQuote}&rdquo;
            </p>
          </div>

          {/* Suggested nodes */}
          {nodeCount > 0 && (
            <div>
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1">
                Suggested Node{nodeCount > 1 ? 's' : ''}
              </p>
              <div className="space-y-1">
                {gap.suggestedNodes.map((node, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <Plus className="w-3 h-3 text-text-tertiary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-text-primary font-medium">{node.title}</span>
                      <span className="text-[10px] text-text-tertiary ml-1">({node.level})</span>
                      {node.description && (
                        <p className="text-[10px] text-text-secondary leading-relaxed">{node.description}</p>
                      )}
                      {node.suggestedParent && (
                        <p className="text-[10px] text-text-tertiary">Under: {node.suggestedParent}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create button */}
          {nodeCount > 0 && !isCreated && (
            <button
              onClick={onCreateNodes}
              disabled={isCreating}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-accent-cyan text-bg-primary rounded hover:bg-accent-cyan/90 transition-colors disabled:opacity-30"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  Create {nodeCount} Node{nodeCount > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
          {isCreated && (
            <p className="text-[10px] text-accent-success font-medium">Nodes created</p>
          )}
        </div>
      )}
    </div>
  )
}

// --- Main Component ---

export function GapDetectionPanel({ result, projectId, onNodesCreated, onDismiss }: GapDetectionPanelProps) {
  const [expandedGapId, setExpandedGapId] = useState<string | null>(null)
  const [creatingGapId, setCreatingGapId] = useState<string | null>(null)
  const [createdGapIds, setCreatedGapIds] = useState<Set<string>>(new Set())
  const [creatingAll, setCreatingAll] = useState(false)

  const grouped = groupBySeverity(result.gaps)
  const severityOrder: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low']

  const highCount = grouped.high.length
  const mediumCount = grouped.medium.length
  const lowCount = grouped.low.length

  const createNodesForGap = useCallback(async (gap: Gap) => {
    const nodes = gap.suggestedNodes
      .filter((n) => VALID_LEVELS.includes(n.level as FeatureLevel))
      .map((n, i) => ({
        tempId: `gap-${gap.id}-${i}`,
        parentTempId: null,
        title: n.title,
        description: n.description || null,
        level: n.level as FeatureLevel,
      }))

    if (nodes.length === 0) return

    const res = await fetch(`/api/projects/${projectId}/feature-nodes/bulk-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to create nodes' }))
      throw new Error(data.error || 'Failed to create nodes')
    }
  }, [projectId])

  const handleCreateForGap = useCallback(async (gap: Gap) => {
    setCreatingGapId(gap.id)
    try {
      await createNodesForGap(gap)
      setCreatedGapIds((prev) => new Set(prev).add(gap.id))
      onNodesCreated?.()
    } catch {
      // Error handling — could add toast here
    } finally {
      setCreatingGapId(null)
    }
  }, [createNodesForGap, onNodesCreated])

  const handleCreateAll = useCallback(async () => {
    setCreatingAll(true)
    const uncreatedGaps = result.gaps.filter((g) => !createdGapIds.has(g.id) && g.suggestedNodes.length > 0)
    for (const gap of uncreatedGaps) {
      try {
        await createNodesForGap(gap)
        setCreatedGapIds((prev) => new Set(prev).add(gap.id))
      } catch {
        // Continue with remaining gaps
      }
    }
    setCreatingAll(false)
    onNodesCreated?.()
  }, [result.gaps, createdGapIds, createNodesForGap, onNodesCreated])

  const allCreated = result.gaps.every((g) => createdGapIds.has(g.id) || g.suggestedNodes.length === 0)

  return (
    <div className="bg-bg-tertiary/50 border border-border-default rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-default bg-accent-warning/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-accent-warning" />
            <h4 className="text-xs font-semibold text-accent-warning">Gap Detection</h4>
          </div>
          <button
            onClick={onDismiss}
            className="text-text-tertiary hover:text-text-primary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Coverage summary */}
      <div className="px-3 py-2 border-b border-border-default flex items-center gap-3 text-[10px]">
        <span className="text-text-tertiary">
          Coverage:{' '}
          <span className={cn('font-semibold', getCoverageColor(result.coveragePercent))}>
            {result.coveragePercent}%
          </span>
        </span>
        <span className="text-text-tertiary">
          Nodes:{' '}
          <span className="font-semibold text-text-primary">{result.treeNodeCount}</span>
        </span>
      </div>

      {/* Gap count badges */}
      {result.gaps.length > 0 && (
        <div className="px-3 py-1.5 border-b border-border-default flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-text-tertiary mr-1">
            {result.gaps.length} gap{result.gaps.length !== 1 ? 's' : ''}:
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
      )}

      {/* Gaps */}
      <div className="p-2 space-y-2 max-h-80 overflow-y-auto">
        {result.gaps.length === 0 && (
          <div className="py-4 text-center">
            <p className="text-xs text-accent-success font-medium">No gaps detected!</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">Your feature tree covers all requirements.</p>
          </div>
        )}

        {severityOrder.map((severity) => {
          const gaps = grouped[severity]
          if (gaps.length === 0) return null
          const config = SEVERITY_CONFIG[severity]

          return (
            <div key={severity}>
              <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1 px-0.5', config.color)}>
                {config.label} Severity ({gaps.length})
              </p>
              <div className="space-y-1">
                {gaps.map((gap) => (
                  <GapCard
                    key={gap.id}
                    gap={gap}
                    isExpanded={expandedGapId === gap.id}
                    onToggle={() => setExpandedGapId(expandedGapId === gap.id ? null : gap.id)}
                    onCreateNodes={() => handleCreateForGap(gap)}
                    isCreating={creatingGapId === gap.id || creatingAll}
                    isCreated={createdGapIds.has(gap.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      {result.gaps.length > 0 && (
        <div className="px-3 py-2 border-t border-border-default flex items-center gap-2">
          {!allCreated && (
            <button
              onClick={handleCreateAll}
              disabled={creatingAll || creatingGapId !== null}
              className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-accent-cyan text-bg-primary rounded hover:bg-accent-cyan/90 transition-colors disabled:opacity-30"
            >
              {creatingAll ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Creating All...
                </>
              ) : (
                'Create All Nodes'
              )}
            </button>
          )}
          <div className="flex-1" />
        </div>
      )}

      {/* Summary */}
      <div className="px-3 py-2 border-t border-border-default">
        <p className="text-[10px] text-text-tertiary leading-relaxed">{result.summary}</p>
      </div>
    </div>
  )
}
