'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import {
  type DiffLine,
  type DiffSegment,
  type SideBySidePair,
  type UnifiedDiffLine,
  buildSideBySide,
  enrichUnifiedDiffWithWords,
  computeDiffStats,
} from '@/lib/shop/version-diff'

interface VersionMeta {
  version_number: number
  created_at: string
  created_by: { id: string; name: string }
}

interface VersionCompareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  docId: string
  fromVersion: number
  toVersion: number
}

export function VersionCompareModal({
  open,
  onOpenChange,
  projectId,
  docId,
  fromVersion: initialFrom,
  toVersion: initialTo,
}: VersionCompareModalProps) {
  const [diff, setDiff] = useState<DiffLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const [diffMode, setDiffMode] = useState<'lines' | 'words'>('lines')

  const [fromVn, setFromVn] = useState(initialFrom)
  const [toVn, setToVn] = useState(initialTo)
  const [versions, setVersions] = useState<VersionMeta[]>([])

  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const scrollingRef = useRef(false)

  // Reset when props change
  useEffect(() => {
    if (open) {
      setFromVn(initialFrom)
      setToVn(initialTo)
    }
  }, [open, initialFrom, initialTo])

  // Fetch version list for selectors
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/requirements-documents/${docId}/versions?limit=100`
        )
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setVersions(data.versions || [])
      } catch { /* ignore */ }
    }
    load()
    return () => { cancelled = true }
  }, [open, projectId, docId])

  // Fetch diff
  useEffect(() => {
    if (!open || !fromVn || !toVn) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/projects/${projectId}/requirements-documents/${docId}/versions/compare?from=${fromVn}&to=${toVn}`
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to load diff')
        }
        const data = await res.json()
        if (!cancelled) setDiff(data.diff || [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load diff')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, projectId, docId, fromVn, toVn])

  const stats = useMemo(() => computeDiffStats(diff), [diff])

  const enrichedDiff = useMemo<UnifiedDiffLine[]>(() => {
    if (diffMode === 'words') return enrichUnifiedDiffWithWords(diff)
    return diff.map(d => ({ ...d }))
  }, [diff, diffMode])

  const sideBySidePairs = useMemo<SideBySidePair[]>(() => {
    if (viewMode !== 'split') return []
    return buildSideBySide(diff, diffMode === 'words')
  }, [diff, viewMode, diffMode])

  const handleScroll = useCallback((side: 'left' | 'right') => {
    if (scrollingRef.current) return
    scrollingRef.current = true
    const source = side === 'left' ? leftRef.current : rightRef.current
    const target = side === 'left' ? rightRef.current : leftRef.current
    if (source && target) {
      target.scrollTop = source.scrollTop
    }
    requestAnimationFrame(() => { scrollingRef.current = false })
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'max-h-[85vh] flex flex-col',
        viewMode === 'split' ? 'max-w-6xl' : 'max-w-3xl'
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-medium">Compare</span>
            <select
              value={fromVn}
              onChange={(e) => setFromVn(Number(e.target.value))}
              className="bg-bg-tertiary border border-border-default rounded px-2 py-1 text-text-primary text-xs"
            >
              {versions.map(v => (
                <option key={v.version_number} value={v.version_number}>
                  v{v.version_number} ({timeAgo(v.created_at)})
                </option>
              ))}
              {!versions.find(v => v.version_number === fromVn) && (
                <option value={fromVn}>v{fromVn}</option>
              )}
            </select>
            <span className="text-text-tertiary">→</span>
            <select
              value={toVn}
              onChange={(e) => setToVn(Number(e.target.value))}
              className="bg-bg-tertiary border border-border-default rounded px-2 py-1 text-text-primary text-xs"
            >
              {versions.map(v => (
                <option key={v.version_number} value={v.version_number}>
                  v{v.version_number} ({timeAgo(v.created_at)})
                </option>
              ))}
              {!versions.find(v => v.version_number === toVn) && (
                <option value={toVn}>v{toVn}</option>
              )}
            </select>
          </DialogTitle>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>

        {/* Controls bar */}
        <div className="flex items-center gap-3 px-6 py-2 bg-bg-tertiary border-b border-border-default flex-wrap">
          <ToggleGroup
            options={[
              { value: 'unified', label: 'Unified' },
              { value: 'split', label: 'Side by Side' },
            ]}
            value={viewMode}
            onChange={(v) => setViewMode(v as 'unified' | 'split')}
          />
          <ToggleGroup
            options={[
              { value: 'lines', label: 'Lines' },
              { value: 'words', label: 'Words' },
            ]}
            value={diffMode}
            onChange={(v) => setDiffMode(v as 'lines' | 'words')}
          />
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="text-accent-success">+{stats.linesAdded}</span>
            <span className="text-accent-error">-{stats.linesRemoved}</span>
            <span className="text-text-tertiary">{stats.percentChanged}%</span>
          </div>
        </div>

        <DialogBody className={cn(
          'flex-1 min-h-0',
          viewMode === 'split' ? 'overflow-hidden' : 'overflow-y-auto'
        )}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <p className="text-sm text-accent-error text-center py-12">{error}</p>
          ) : diff.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-12">No differences found.</p>
          ) : viewMode === 'unified' ? (
            <UnifiedView diff={enrichedDiff} />
          ) : (
            <SplitView
              pairs={sideBySidePairs}
              leftRef={leftRef}
              rightRef={rightRef}
              onScroll={handleScroll}
            />
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex rounded-md border border-border-default overflow-hidden text-xs">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-2.5 py-1 transition-colors',
            i > 0 && 'border-l border-border-default',
            value === opt.value
              ? 'bg-accent-cyan/15 text-accent-cyan'
              : 'text-text-secondary hover:bg-bg-primary'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function UnifiedView({ diff }: { diff: UnifiedDiffLine[] }) {
  return (
    <div className="font-mono text-xs leading-6">
      {diff.map((line, i) => (
        <div
          key={i}
          className={cn(
            'flex items-start px-3 py-0.5 min-h-[1.5em]',
            line.type === 'addition' && 'bg-accent-success/10',
            line.type === 'deletion' && 'bg-accent-error/10',
          )}
        >
          <span className={cn(
            'w-5 flex-shrink-0 text-center select-none',
            line.type === 'addition' && 'text-accent-success',
            line.type === 'deletion' && 'text-accent-error',
            line.type === 'context' && 'text-text-tertiary',
          )}>
            {line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '}
          </span>
          <span className={cn(
            'flex-1 whitespace-pre-wrap break-all',
            line.type === 'context' && 'text-text-secondary',
            line.type === 'addition' && !line.wordSegments && 'text-accent-success',
            line.type === 'deletion' && !line.wordSegments && 'text-accent-error',
          )}>
            {line.wordSegments ? (
              <WordHighlight
                segments={line.wordSegments}
                baseType={line.type}
              />
            ) : (
              line.text || '\u00A0'
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

function SplitView({
  pairs,
  leftRef,
  rightRef,
  onScroll,
}: {
  pairs: SideBySidePair[]
  leftRef: React.RefObject<HTMLDivElement | null>
  rightRef: React.RefObject<HTMLDivElement | null>
  onScroll: (side: 'left' | 'right') => void
}) {
  return (
    <div className="flex h-full">
      {/* Left panel (old) */}
      <div
        ref={leftRef}
        onScroll={() => onScroll('left')}
        className="flex-1 overflow-y-auto border-r border-border-default font-mono text-xs leading-6"
      >
        {pairs.map((pair, i) => (
          <SplitLine key={i} side={pair.left} />
        ))}
      </div>
      {/* Right panel (new) */}
      <div
        ref={rightRef}
        onScroll={() => onScroll('right')}
        className="flex-1 overflow-y-auto font-mono text-xs leading-6"
      >
        {pairs.map((pair, i) => (
          <SplitLine key={i} side={pair.right} />
        ))}
      </div>
    </div>
  )
}

function SplitLine({ side }: {
  side: SideBySidePair['left'] | SideBySidePair['right']
}) {
  const isDeletion = side.type === 'deletion'
  const isAddition = side.type === 'addition'
  const isEmpty = side.type === 'empty'

  return (
    <div className={cn(
      'flex items-start px-2 py-0.5 min-h-[1.5em]',
      isDeletion && 'bg-accent-error/10',
      isAddition && 'bg-accent-success/10',
      isEmpty && 'bg-bg-tertiary/30',
    )}>
      <span className="w-8 text-right pr-2 text-text-tertiary select-none flex-shrink-0">
        {side.lineNum ?? ''}
      </span>
      <span className={cn(
        'flex-1 whitespace-pre-wrap break-all',
        side.type === 'context' && 'text-text-secondary',
        isDeletion && !side.wordSegments && 'text-accent-error',
        isAddition && !side.wordSegments && 'text-accent-success',
      )}>
        {side.wordSegments ? (
          <WordHighlight
            segments={side.wordSegments}
            baseType={isDeletion ? 'deletion' : isAddition ? 'addition' : 'context'}
          />
        ) : isEmpty ? (
          '\u00A0'
        ) : (
          side.text || '\u00A0'
        )}
      </span>
    </div>
  )
}

function WordHighlight({ segments, baseType }: {
  segments: DiffSegment[]
  baseType: 'context' | 'addition' | 'deletion'
}) {
  const baseColor = baseType === 'addition' ? 'text-accent-success' : baseType === 'deletion' ? 'text-accent-error' : 'text-text-secondary'

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'equal') {
          return <span key={i} className={baseColor}>{seg.text}</span>
        }
        // Highlight changed words with stronger background
        return (
          <span
            key={i}
            className={cn(
              'rounded-sm px-0.5',
              seg.type === 'delete' && 'bg-accent-error/30 text-accent-error font-semibold',
              seg.type === 'insert' && 'bg-accent-success/30 text-accent-success font-semibold',
            )}
          >
            {seg.text}
          </span>
        )
      })}
    </>
  )
}
