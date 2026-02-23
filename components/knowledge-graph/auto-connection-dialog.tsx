'use client'

import { useState, useCallback } from 'react'
import { Sparkles, CheckSquare, Square } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SuggestionCard } from './suggestion-card'
import type { ConnectionSuggestion } from './suggestion-card'
import type { EntityConnectionType } from '@/types/database'

interface AutoConnectionDialogProps {
  suggestions: ConnectionSuggestion[]
  isOpen: boolean
  isLoading?: boolean
  onAccept: (selected: ConnectionSuggestion[]) => void
  onDismiss: () => void
}

export function AutoConnectionDialog({
  suggestions,
  isOpen,
  isLoading = false,
  onAccept,
  onDismiss,
}: AutoConnectionDialogProps) {
  // Track which suggestions are selected (default: all with confidence >= 70)
  const [selected, setSelected] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const s of suggestions) {
      if (s.confidence >= 70) {
        initial.add(`${s.target_type}:${s.target_id}`)
      }
    }
    return initial
  })

  // Track modified connection types
  const [typeOverrides, setTypeOverrides] = useState<Record<string, EntityConnectionType>>({})

  // Re-initialize selection when suggestions change
  const currentKeys = suggestions.map(s => `${s.target_type}:${s.target_id}`).join(',')
  const [lastKeys, setLastKeys] = useState(currentKeys)
  if (currentKeys !== lastKeys) {
    setLastKeys(currentKeys)
    const initial = new Set<string>()
    for (const s of suggestions) {
      if (s.confidence >= 70) {
        initial.add(`${s.target_type}:${s.target_id}`)
      }
    }
    setSelected(initial)
    setTypeOverrides({})
  }

  const toggleItem = useCallback((key: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selected.size === suggestions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(suggestions.map(s => `${s.target_type}:${s.target_id}`)))
    }
  }, [selected.size, suggestions])

  const handleChangeType = useCallback((key: string, newType: EntityConnectionType) => {
    setTypeOverrides(prev => ({ ...prev, [key]: newType }))
  }, [])

  const handleAccept = useCallback(() => {
    const selectedSuggestions = suggestions
      .filter(s => selected.has(`${s.target_type}:${s.target_id}`))
      .map(s => {
        const key = `${s.target_type}:${s.target_id}`
        return {
          ...s,
          connection_type: typeOverrides[key] || s.connection_type,
        }
      })
    onAccept(selectedSuggestions)
  }, [suggestions, selected, typeOverrides, onAccept])

  const allSelected = selected.size === suggestions.length
  const selectedCount = selected.size

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onDismiss() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-warning" />
            <h2 className="text-lg font-semibold text-text-primary">
              {suggestions.length} Connection{suggestions.length !== 1 ? 's' : ''} Detected
            </h2>
          </div>
          <p className="text-xs text-text-tertiary mt-1">
            We found references to other entities in your document. Select which connections to create.
          </p>
        </DialogHeader>

        <DialogBody>
          {/* Select all toggle */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-accent-cyan" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-text-tertiary">
              {selectedCount} of {suggestions.length} selected
            </span>
          </div>

          {/* Suggestion list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {suggestions.map((suggestion) => {
              const key = `${suggestion.target_type}:${suggestion.target_id}`
              const displaySuggestion = {
                ...suggestion,
                connection_type: typeOverrides[key] || suggestion.connection_type,
              }
              return (
                <SuggestionCard
                  key={key}
                  suggestion={displaySuggestion}
                  checked={selected.has(key)}
                  onToggle={(checked) => toggleItem(key, checked)}
                  onChangeType={(newType) => handleChangeType(key, newType)}
                />
              )
            })}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onDismiss} disabled={isLoading}>
            Dismiss All
          </Button>
          <Button
            onClick={handleAccept}
            isLoading={isLoading}
            disabled={selectedCount === 0}
          >
            Create {selectedCount > 0 ? `${selectedCount} ` : ''}Connection{selectedCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
