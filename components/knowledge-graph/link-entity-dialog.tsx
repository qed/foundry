'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast-container'
import { EntityTypeIcon, getEntityTypeLabel } from './entity-type-icon'
import { ConnectionTypeIcon, CONNECTION_TYPE_CONFIG } from './connection-type-icon'
import { Search, ArrowRight, ChevronLeft, Link2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GraphEntityType, EntityConnectionType } from '@/types/database'

interface SearchResult {
  type: GraphEntityType
  id: string
  name: string
  status?: string
  already_linked?: boolean
}

interface LinkEntityDialogProps {
  sourceType: GraphEntityType
  sourceId: string
  sourceName: string
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

type Step = 'search' | 'type' | 'confirm'

// Smart connection type suggestions based on entity type combinations
const TYPE_SUGGESTIONS: Partial<Record<GraphEntityType, Partial<Record<GraphEntityType, EntityConnectionType[]>>>> = {
  feature: {
    feature: ['relates_to', 'conflicts_with', 'complements', 'depends_on'],
    blueprint: ['depends_on', 'references'],
    artifact: ['references'],
    idea: ['implements', 'derived_from'],
    work_order: ['depends_on'],
    feedback: ['relates_to'],
  },
  blueprint: {
    blueprint: ['relates_to', 'references', 'conflicts_with'],
    feature: ['implements', 'references'],
    idea: ['implements', 'references'],
    work_order: ['references'],
    artifact: ['references'],
    feedback: ['relates_to'],
  },
  idea: {
    idea: ['relates_to', 'conflicts_with', 'complements'],
    feature: ['relates_to', 'derived_from'],
    blueprint: ['relates_to'],
    work_order: ['relates_to'],
    feedback: ['relates_to'],
    artifact: ['references'],
  },
  work_order: {
    work_order: ['relates_to', 'depends_on'],
    feature: ['implements'],
    blueprint: ['implements', 'references'],
    idea: ['implements'],
    feedback: ['relates_to'],
    artifact: ['references'],
  },
  feedback: {
    feedback: ['relates_to'],
    idea: ['relates_to'],
    feature: ['relates_to'],
    blueprint: ['relates_to'],
    work_order: ['relates_to'],
    artifact: ['references'],
  },
  artifact: {
    artifact: ['relates_to'],
    feature: ['references'],
    blueprint: ['references'],
    idea: ['references'],
    work_order: ['references'],
    feedback: ['references'],
  },
}

const ALL_CONNECTION_TYPES: EntityConnectionType[] = [
  'references', 'implements', 'depends_on', 'relates_to',
  'derived_from', 'conflicts_with', 'complements',
]

const TYPE_DESCRIPTIONS: Record<EntityConnectionType, string> = {
  references: 'Source mentions or references target',
  implements: 'Source implements requirements in target',
  depends_on: 'Source depends on target for implementation',
  relates_to: 'Source is conceptually related to target',
  derived_from: 'Source is derived from target',
  conflicts_with: 'Source conflicts with target',
  complements: 'Source complements or enhances target',
}

function getSuggestedTypes(source: GraphEntityType, target: GraphEntityType): EntityConnectionType[] {
  const suggested = TYPE_SUGGESTIONS[source]?.[target]
  if (suggested && suggested.length > 0) return suggested
  return ['references', 'relates_to']
}

export function LinkEntityDialog({
  sourceType,
  sourceId,
  sourceName,
  projectId,
  open,
  onOpenChange,
  onCreated,
}: LinkEntityDialogProps) {
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<SearchResult | null>(null)
  const [connectionType, setConnectionType] = useState<EntityConnectionType>('relates_to')
  const [isCreating, setIsCreating] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { addToast } = useToast()

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('search')
      setQuery('')
      setResults([])
      setSelectedTarget(null)
      setConnectionType('relates_to')
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/entity-search?query=${encodeURIComponent(query)}&exclude_type=${sourceType}&exclude_id=${sourceId}`
        )
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
        }
      } catch {
        // Ignore
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, projectId, sourceType, sourceId])

  const handleSelectTarget = useCallback((result: SearchResult) => {
    if (result.already_linked) return
    setSelectedTarget(result)
    // Pick best default connection type for this pair
    const suggested = getSuggestedTypes(sourceType, result.type)
    setConnectionType(suggested[0])
    setStep('type')
  }, [sourceType])

  const handleCreate = useCallback(async () => {
    if (!selectedTarget) return
    setIsCreating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          sourceId,
          targetType: selectedTarget.type,
          targetId: selectedTarget.id,
          connectionType,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409) {
          addToast('This connection already exists', 'warning')
        } else {
          throw new Error(data.error || 'Failed to create connection')
        }
        return
      }

      addToast('Connection created', 'success')
      onCreated()
      onOpenChange(false)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create connection', 'error')
    } finally {
      setIsCreating(false)
    }
  }, [selectedTarget, projectId, sourceType, sourceId, connectionType, addToast, onCreated, onOpenChange])

  const suggestedTypes = selectedTarget
    ? getSuggestedTypes(sourceType, selectedTarget.type)
    : ALL_CONNECTION_TYPES

  const otherTypes = ALL_CONNECTION_TYPES.filter((t) => !suggestedTypes.includes(t))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-accent-cyan" />
            {step === 'search' && 'Link Entity'}
            {step === 'type' && 'Connection Type'}
            {step === 'confirm' && 'Confirm Link'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 min-h-[300px]">
          {/* Step 1: Search */}
          {step === 'search' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1 text-xs text-text-secondary">
                <EntityTypeIcon type={sourceType} className="w-3.5 h-3.5" />
                <span className="font-medium text-text-primary truncate">{sourceName}</span>
                <ArrowRight className="w-3 h-3 text-text-tertiary" />
                <span className="text-text-tertiary">Search for target...</span>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search entities to link..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-cyan/50"
                />
              </div>

              <div className="max-h-[240px] overflow-y-auto space-y-0.5">
                {isSearching && (
                  <div className="flex justify-center py-6">
                    <Spinner size="sm" />
                  </div>
                )}
                {!isSearching && query.length >= 2 && results.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-xs text-text-tertiary">No entities found matching &ldquo;{query}&rdquo;</p>
                  </div>
                )}
                {!isSearching && results.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelectTarget(r)}
                    disabled={r.already_linked}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors',
                      r.already_linked
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-bg-secondary cursor-pointer'
                    )}
                  >
                    <EntityTypeIcon type={r.type} className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{r.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-text-tertiary">{getEntityTypeLabel(r.type)}</span>
                        {r.status && (
                          <span className="text-[10px] text-text-tertiary border border-border-default rounded px-1 py-0">{r.status}</span>
                        )}
                      </div>
                    </div>
                    {r.already_linked && (
                      <span className="text-[10px] text-text-tertiary flex-shrink-0">Already linked</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Connection Type */}
          {step === 'type' && selectedTarget && (
            <div className="space-y-3">
              {/* Source → Target display */}
              <div className="flex items-center gap-2 px-1 text-xs">
                <EntityTypeIcon type={sourceType} className="w-3.5 h-3.5" />
                <span className="font-medium text-text-primary truncate max-w-[120px]">{sourceName}</span>
                <ArrowRight className="w-3 h-3 text-text-tertiary flex-shrink-0" />
                <EntityTypeIcon type={selectedTarget.type} className="w-3.5 h-3.5" />
                <span className="font-medium text-text-primary truncate max-w-[120px]">{selectedTarget.name}</span>
              </div>

              {/* Suggested types */}
              <div>
                <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5 px-1">
                  Suggested
                </p>
                <div className="space-y-1">
                  {suggestedTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setConnectionType(type)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors',
                        connectionType === type
                          ? 'bg-accent-cyan/10 border border-accent-cyan/30'
                          : 'hover:bg-bg-secondary border border-transparent'
                      )}
                    >
                      <ConnectionTypeIcon type={type} className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-text-primary">{CONNECTION_TYPE_CONFIG[type].label}</p>
                        <p className="text-[10px] text-text-tertiary mt-0.5">{TYPE_DESCRIPTIONS[type]}</p>
                      </div>
                      {connectionType === type && (
                        <Check className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Other types */}
              {otherTypes.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5 px-1">
                    Other
                  </p>
                  <div className="space-y-1">
                    {otherTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setConnectionType(type)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors',
                          connectionType === type
                            ? 'bg-accent-cyan/10 border border-accent-cyan/30'
                            : 'hover:bg-bg-secondary border border-transparent'
                        )}
                      >
                        <ConnectionTypeIcon type={type} className="w-4 h-4 flex-shrink-0 opacity-60" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-text-secondary">{CONNECTION_TYPE_CONFIG[type].label}</p>
                          <p className="text-[10px] text-text-tertiary mt-0.5">{TYPE_DESCRIPTIONS[type]}</p>
                        </div>
                        {connectionType === type && (
                          <Check className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && selectedTarget && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-text-secondary px-1">Review the connection before creating:</p>

              <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary rounded-lg">
                {/* Source */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <EntityTypeIcon type={sourceType} className="w-4 h-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{sourceName}</p>
                    <p className="text-[10px] text-text-tertiary">{getEntityTypeLabel(sourceType)}</p>
                  </div>
                </div>

                {/* Connection type */}
                <div className="flex flex-col items-center flex-shrink-0 px-2">
                  <ConnectionTypeIcon type={connectionType} className="w-4 h-4" />
                  <span className="text-[10px] font-medium text-text-secondary mt-0.5">
                    {CONNECTION_TYPE_CONFIG[connectionType].label}
                  </span>
                </div>

                {/* Target */}
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{selectedTarget.name}</p>
                    <p className="text-[10px] text-text-tertiary">{getEntityTypeLabel(selectedTarget.type)}</p>
                  </div>
                  <EntityTypeIcon type={selectedTarget.type} className="w-4 h-4 flex-shrink-0" />
                </div>
              </div>

              <p className="text-[10px] text-text-tertiary px-1 text-center">
                {TYPE_DESCRIPTIONS[connectionType]}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'search' && (
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}

          {step === 'type' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep('search')}>
                <ChevronLeft className="w-3 h-3 mr-1" />
                Back
              </Button>
              <div className="flex-1" />
              <Button variant="primary" size="sm" onClick={() => setStep('confirm')}>
                Next
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep('type')}>
                <ChevronLeft className="w-3 h-3 mr-1" />
                Back
              </Button>
              <div className="flex-1" />
              <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreate} isLoading={isCreating}>
                Create Link
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
