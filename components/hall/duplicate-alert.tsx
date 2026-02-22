'use client'

import { useState, useCallback } from 'react'
import {
  AlertTriangle,
  X,
  Eye,
  Link2,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast-container'
import { timeAgo } from '@/lib/utils'

export interface DuplicateIdea {
  ideaId: string
  title: string
  preview: string
  similarity: number
  reason: string
  createdAt: string
}

interface DuplicateAlertProps {
  newIdeaId: string
  newIdeaTitle: string
  duplicates: DuplicateIdea[]
  onDismiss: () => void
  onViewIdea: (ideaId: string) => void
  onLinked?: () => void
}

const CONNECTION_TYPES = [
  { value: 'duplicates', label: 'Duplicate' },
  { value: 'related', label: 'Related' },
  { value: 'extends', label: 'Extends' },
] as const

export function DuplicateAlert({
  newIdeaId,
  newIdeaTitle,
  duplicates,
  onDismiss,
  onViewIdea,
  onLinked,
}: DuplicateAlertProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const { addToast } = useToast()

  const handleLink = useCallback(async (targetIdeaId: string, connectionType: string) => {
    setIsLinking(true)
    try {
      const res = await fetch(`/api/hall/ideas/${newIdeaId}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetIdeaId,
          connectionType,
        }),
      })

      if (!res.ok) {
        addToast('Failed to link ideas', 'error')
        return
      }

      addToast('Ideas linked', 'success')
      setLinkingId(null)
      setDismissed((prev) => new Set(prev).add(targetIdeaId))
      onLinked?.()
    } catch {
      addToast('Failed to link ideas', 'error')
    } finally {
      setIsLinking(false)
    }
  }, [newIdeaId, addToast, onLinked])

  const handleDismissOne = useCallback((ideaId: string) => {
    setDismissed((prev) => new Set(prev).add(ideaId))
  }, [])

  const visibleDuplicates = duplicates.filter((d) => !dismissed.has(d.ideaId))

  if (visibleDuplicates.length === 0) return null

  return (
    <div className="mx-4 md:mx-6 lg:mx-8 mb-4 p-4 bg-accent-warning/5 border border-accent-warning/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-accent-warning flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-medium text-text-primary">
              Possible Duplicates Found
            </h3>
            <button
              onClick={onDismiss}
              className="p-1 text-text-tertiary hover:text-text-secondary rounded transition-colors"
              title="Dismiss all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-text-tertiary mb-3">
            We found ideas similar to &ldquo;{newIdeaTitle}&rdquo;
          </p>

          <div className="space-y-2">
            {visibleDuplicates.map((dup) => (
              <div
                key={dup.ideaId}
                className="p-3 bg-bg-secondary border border-border-default rounded-lg"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-medium text-text-primary truncate">
                    {dup.title}
                  </h4>
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
                      dup.similarity >= 0.8
                        ? 'bg-accent-error/10 text-accent-error'
                        : dup.similarity >= 0.6
                          ? 'bg-accent-warning/10 text-accent-warning'
                          : 'bg-accent-cyan/10 text-accent-cyan'
                    )}
                  >
                    {Math.round(dup.similarity * 100)}%
                  </span>
                </div>

                {dup.preview && (
                  <p className="text-xs text-text-tertiary line-clamp-2 mb-1.5">
                    {dup.preview}
                  </p>
                )}

                <p className="text-[10px] text-text-tertiary mb-2">
                  {dup.reason} &middot; {timeAgo(dup.createdAt)}
                </p>

                {/* Actions */}
                {linkingId === dup.ideaId ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-tertiary">Link as:</span>
                    {CONNECTION_TYPES.map((ct) => (
                      <button
                        key={ct.value}
                        onClick={() => handleLink(dup.ideaId, ct.value)}
                        disabled={isLinking}
                        className="px-2 py-0.5 text-[10px] font-medium bg-bg-tertiary text-text-secondary rounded hover:text-accent-cyan hover:bg-accent-cyan/5 transition-colors disabled:opacity-50"
                      >
                        {isLinking ? <Loader2 className="w-3 h-3 animate-spin" /> : ct.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setLinkingId(null)}
                      className="text-[10px] text-text-tertiary hover:text-text-secondary ml-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      onClick={() => onViewIdea(dup.ideaId)}
                      className="flex items-center gap-1 font-medium text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <button
                      onClick={() => setLinkingId(dup.ideaId)}
                      className="flex items-center gap-1 font-medium text-accent-purple hover:text-accent-purple/80 transition-colors"
                    >
                      <Link2 className="w-3 h-3" />
                      Link
                    </button>
                    <button
                      onClick={() => handleDismissOne(dup.ideaId)}
                      className="font-medium text-text-tertiary hover:text-text-secondary transition-colors ml-auto"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
