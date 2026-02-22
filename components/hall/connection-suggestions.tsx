'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Sparkles,
  Loader2,
  Link2,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast-container'

interface ConnectionSuggestion {
  ideaId: string
  title: string
  preview: string
  connectionType: string
  confidence: number
  reasoning: string
  createdAt: string
}

const CONNECTION_TYPE_LABELS: Record<string, string> = {
  related: 'Related',
  extends: 'Extends',
  duplicates: 'Duplicate',
}

interface ConnectionSuggestionsProps {
  ideaId: string
  projectId: string
  onIdeaClick?: (ideaId: string) => void
  onConnectionCreated?: () => void
}

export function ConnectionSuggestions({
  ideaId,
  projectId,
  onIdeaClick,
  onConnectionCreated,
}: ConnectionSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLinking, setIsLinking] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const { addToast } = useToast()

  const analyze = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/agent/hall/find-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ideaId }),
      })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.connections || [])
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false)
    }
  }, [ideaId, projectId])

  useEffect(() => {
    analyze()
  }, [analyze])

  const handleLink = useCallback(
    async (targetIdeaId: string, connectionType: string) => {
      setIsLinking(targetIdeaId)
      try {
        const res = await fetch(`/api/hall/ideas/${ideaId}/connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetIdeaId, connectionType }),
        })

        if (res.status === 409) {
          addToast('Connection already exists', 'info')
          setSuggestions((prev) => prev.filter((s) => s.ideaId !== targetIdeaId))
          return
        }

        if (!res.ok) {
          addToast('Failed to create connection', 'error')
          return
        }

        addToast('Connection created', 'success')
        setSuggestions((prev) => prev.filter((s) => s.ideaId !== targetIdeaId))
        onConnectionCreated?.()
      } catch {
        addToast('Failed to create connection', 'error')
      } finally {
        setIsLinking(null)
      }
    },
    [ideaId, addToast, onConnectionCreated]
  )

  const handleDismissSuggestion = useCallback((targetIdeaId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.ideaId !== targetIdeaId))
  }, [])

  if (dismissed || (!isLoading && suggestions.length === 0)) {
    return null
  }

  return (
    <div className="p-4 bg-accent-purple/5 border border-accent-purple/20 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-medium text-accent-purple hover:text-accent-purple/80 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Suggested Connections</span>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          {!isLoading && suggestions.length > 0 && (
            <span className="text-[10px] text-text-tertiary">({suggestions.length})</span>
          )}
          {expanded ? (
            <ChevronUp className="w-3 h-3 text-text-tertiary" />
          ) : (
            <ChevronDown className="w-3 h-3 text-text-tertiary" />
          )}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-0.5 text-text-tertiary hover:text-text-secondary rounded transition-colors"
          title="Dismiss suggestions"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {expanded && (
        <>
          {isLoading && suggestions.length === 0 && (
            <div className="flex items-center gap-2 py-3 text-xs text-text-tertiary">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing connections...
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((s) => (
                <div
                  key={s.ideaId}
                  className="p-2.5 bg-bg-secondary border border-border-default rounded-lg"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium text-text-primary truncate">
                      {s.title}
                    </h4>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                          s.confidence >= 0.8
                            ? 'bg-accent-success/10 text-accent-success'
                            : s.confidence >= 0.7
                              ? 'bg-accent-cyan/10 text-accent-cyan'
                              : 'bg-text-tertiary/10 text-text-tertiary'
                        )}
                      >
                        {Math.round(s.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  {s.preview && (
                    <p className="text-xs text-text-tertiary line-clamp-2 mb-1">
                      {s.preview}
                    </p>
                  )}

                  <p className="text-[10px] text-text-tertiary mb-2 italic">
                    {s.reasoning}
                  </p>

                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      onClick={() => onIdeaClick?.(s.ideaId)}
                      className="flex items-center gap-1 font-medium text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <button
                      onClick={() => handleLink(s.ideaId, s.connectionType)}
                      disabled={isLinking === s.ideaId}
                      className="flex items-center gap-1 font-medium text-accent-purple hover:text-accent-purple/80 transition-colors disabled:opacity-50"
                    >
                      {isLinking === s.ideaId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Link2 className="w-3 h-3" />
                      )}
                      Link as {CONNECTION_TYPE_LABELS[s.connectionType] || s.connectionType}
                    </button>
                    <button
                      onClick={() => handleDismissSuggestion(s.ideaId)}
                      className="font-medium text-text-tertiary hover:text-text-secondary transition-colors ml-auto"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
