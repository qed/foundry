'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Minus as MinusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiffLine {
  type: 'context' | 'addition' | 'deletion'
  text: string
}

interface DiffStats {
  additions: number
  deletions: number
  from_chars: number
  to_chars: number
}

interface BlueprintVersionDiffProps {
  open: boolean
  onClose: () => void
  projectId: string
  blueprintId: string
  fromVersion: number
  toVersion: number | 'current'
}

export function BlueprintVersionDiff({
  open,
  onClose,
  projectId,
  blueprintId,
  fromVersion,
  toVersion,
}: BlueprintVersionDiffProps) {
  const [diff, setDiff] = useState<DiffLine[]>([])
  const [stats, setStats] = useState<DiffStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set())

  const fetchDiff = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/blueprints/${blueprintId}/versions/diff?from_version=${fromVersion}&to_version=${toVersion}`
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load diff')
      }
      const data = await res.json()
      setDiff(data.diff || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diff')
    } finally {
      setLoading(false)
    }
  }, [projectId, blueprintId, fromVersion, toVersion])

  useEffect(() => {
    if (open) {
      fetchDiff()
    }
  }, [open, fetchDiff])

  // Group diff lines into sections: context blocks and change blocks
  const sections = groupDiffSections(diff)

  const toggleSection = useCallback((idx: number) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[90vw] max-w-4xl max-h-[85vh] bg-bg-secondary border border-border-default rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-default flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Comparing Version {fromVersion} → {toVersion === 'current' ? 'Current' : `Version ${toVersion}`}
            </h3>
            {stats && (
              <p className="text-xs text-text-tertiary mt-0.5">
                <span className="text-accent-success">+{stats.additions} additions</span>
                {' / '}
                <span className="text-accent-error">-{stats.deletions} deletions</span>
                {' / '}
                {stats.from_chars} → {stats.to_chars} chars
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            aria-label="Close diff view"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-text-tertiary">Loading diff...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-accent-error">{error}</p>
            </div>
          ) : diff.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-text-tertiary">No differences found</p>
            </div>
          ) : (
            <div className="font-mono text-xs">
              {sections.map((section, sIdx) => {
                const isContext = section.every((l) => l.type === 'context')
                const isCollapsed = collapsedSections.has(sIdx)

                // Collapse large unchanged context sections
                if (isContext && section.length > 6) {
                  return (
                    <div key={sIdx}>
                      {/* Show first 3 lines */}
                      {section.slice(0, 3).map((line, lIdx) => (
                        <DiffLineRow key={`${sIdx}-${lIdx}`} line={line} lineNumber={getLineNumber(sections, sIdx, lIdx)} />
                      ))}
                      <button
                        onClick={() => toggleSection(sIdx)}
                        className="w-full py-1 text-center text-text-tertiary bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors border-y border-border-default"
                      >
                        {isCollapsed ? `▼ Show ${section.length - 6} more lines` : `▲ Hide ${section.length - 6} lines`}
                      </button>
                      {!isCollapsed && section.slice(3, -3).map((line, lIdx) => (
                        <DiffLineRow key={`${sIdx}-m-${lIdx}`} line={line} lineNumber={getLineNumber(sections, sIdx, lIdx + 3)} />
                      ))}
                      {/* Show last 3 lines */}
                      {section.slice(-3).map((line, lIdx) => (
                        <DiffLineRow key={`${sIdx}-e-${lIdx}`} line={line} lineNumber={getLineNumber(sections, sIdx, section.length - 3 + lIdx)} />
                      ))}
                    </div>
                  )
                }

                return (
                  <div key={sIdx}>
                    {section.map((line, lIdx) => (
                      <DiffLineRow key={`${sIdx}-${lIdx}`} line={line} lineNumber={getLineNumber(sections, sIdx, lIdx)} />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DiffLineRow({ line, lineNumber }: { line: DiffLine; lineNumber: number }) {
  return (
    <div
      className={cn(
        'flex items-start px-4 py-0.5 min-h-[1.5em]',
        line.type === 'addition' && 'bg-accent-success/10',
        line.type === 'deletion' && 'bg-accent-error/10'
      )}
    >
      <span className="w-8 text-right pr-2 text-text-tertiary select-none flex-shrink-0">
        {lineNumber}
      </span>
      <span className={cn(
        'w-5 flex-shrink-0 text-center select-none',
        line.type === 'addition' && 'text-accent-success',
        line.type === 'deletion' && 'text-accent-error'
      )}>
        {line.type === 'addition' && <Plus className="w-3 h-3 inline" />}
        {line.type === 'deletion' && <MinusIcon className="w-3 h-3 inline" />}
      </span>
      <span className={cn(
        'flex-1 whitespace-pre-wrap break-all',
        line.type === 'context' && 'text-text-tertiary',
        line.type === 'addition' && 'text-accent-success',
        line.type === 'deletion' && 'text-accent-error'
      )}>
        {line.text || '\u00A0'}
      </span>
    </div>
  )
}

/**
 * Group diff lines into sections of contiguous same-type or context lines.
 * Changes (additions + deletions) stay together, context lines group together.
 */
function groupDiffSections(lines: DiffLine[]): DiffLine[][] {
  if (lines.length === 0) return []

  const sections: DiffLine[][] = []
  let currentSection: DiffLine[] = [lines[0]]

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1]
    const curr = lines[i]
    const prevIsContext = prev.type === 'context'
    const currIsContext = curr.type === 'context'

    if (prevIsContext !== currIsContext) {
      sections.push(currentSection)
      currentSection = [curr]
    } else {
      currentSection.push(curr)
    }
  }

  sections.push(currentSection)
  return sections
}

/**
 * Get the overall line number for a line within sections.
 */
function getLineNumber(sections: DiffLine[][], sectionIdx: number, lineIdx: number): number {
  let count = 0
  for (let s = 0; s < sectionIdx; s++) {
    count += sections[s].length
  }
  return count + lineIdx + 1
}
