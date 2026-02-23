'use client'

import { useState, useEffect, useCallback } from 'react'
import { Box, Boxes, Wrench, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-container'
import type { ExtractionStrategy } from '@/types/database'

interface ExtractionStrategyConfigProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

const STRATEGIES: {
  value: ExtractionStrategy
  label: string
  description: string
  icon: typeof Box
}[] = [
  {
    value: 'feature-slice',
    label: 'Feature-Slice',
    description: 'One work order per feature. Covers all aspects (frontend, backend, database) in one WO. Best for small teams and full-stack work.',
    icon: Box,
  },
  {
    value: 'specialist',
    label: 'Specialist Split',
    description: 'Split work by role: Frontend, Backend, Database, QA. Creates separate work orders for each specialist area. Best for larger teams.',
    icon: Boxes,
  },
  {
    value: 'custom',
    label: 'Custom Instructions',
    description: 'Provide custom extraction instructions. The agent will interpret and extract accordingly. Best for unique workflows.',
    icon: Wrench,
  },
]

const MAX_INSTRUCTIONS = 1500

export function ExtractionStrategyConfig({
  open,
  onOpenChange,
  projectId,
}: ExtractionStrategyConfigProps) {
  const { addToast } = useToast()
  const [strategy, setStrategy] = useState<ExtractionStrategy>('feature-slice')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initialStrategy, setInitialStrategy] = useState<ExtractionStrategy>('feature-slice')
  const [initialInstructions, setInitialInstructions] = useState('')

  // Fetch current config on open
  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/settings/extraction-strategy`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            const s = data.strategy || 'feature-slice'
            setStrategy(s)
            setInitialStrategy(s)
            setInstructions(data.instructions || '')
            setInitialInstructions(data.instructions || '')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, projectId])

  const hasChanges = strategy !== initialStrategy || (strategy === 'custom' && instructions !== initialInstructions)
  const isValid = strategy !== 'custom' || (instructions.trim().length > 0 && instructions.length <= MAX_INSTRUCTIONS)

  const handleSave = useCallback(async () => {
    if (!isValid) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings/extraction-strategy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
          instructions: strategy === 'custom' ? instructions : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        addToast(data.error || 'Failed to save strategy', 'error')
        return
      }

      setInitialStrategy(strategy)
      setInitialInstructions(instructions)
      addToast('Extraction strategy updated', 'success')
      onOpenChange(false)
    } catch {
      addToast('Failed to save strategy', 'error')
    } finally {
      setSaving(false)
    }
  }, [projectId, strategy, instructions, isValid, addToast, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-accent-cyan" />
            Extraction Strategy
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-xs text-text-secondary">
            Configure how blueprints are converted to work orders when using AI extraction.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Strategy radio buttons */}
              <div className="space-y-2">
                {STRATEGIES.map((s) => {
                  const Icon = s.icon
                  const isSelected = strategy === s.value
                  return (
                    <button
                      key={s.value}
                      onClick={() => setStrategy(s.value)}
                      className={cn(
                        'w-full flex items-start gap-3 px-3 py-3 rounded-lg border text-left transition-colors',
                        isSelected
                          ? 'border-accent-cyan/40 bg-accent-cyan/5'
                          : 'border-border-default hover:bg-bg-tertiary'
                      )}
                    >
                      {/* Radio dot */}
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors',
                        isSelected ? 'border-accent-cyan' : 'border-text-tertiary'
                      )}>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-accent-cyan" />
                        )}
                      </div>
                      <Icon className={cn(
                        'w-4 h-4 flex-shrink-0 mt-0.5',
                        isSelected ? 'text-accent-cyan' : 'text-text-tertiary'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium',
                          isSelected ? 'text-accent-cyan' : 'text-text-primary'
                        )}>
                          {s.label}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {s.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Custom instructions textarea */}
              {strategy === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">
                    Extraction Instructions
                  </label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={4}
                    maxLength={MAX_INSTRUCTIONS}
                    className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-cyan transition-colors resize-none"
                    placeholder="e.g., 'Split each feature into: API layer, UI layer, and Database layer. Assign API to backend, UI to frontend, Database to DBA.'"
                  />
                  <div className="flex items-center justify-between">
                    {instructions.trim().length === 0 && (
                      <p className="text-[10px] text-accent-warning">
                        Instructions are required for custom strategy
                      </p>
                    )}
                    <div className="flex-1" />
                    <span className={cn(
                      'text-[10px]',
                      instructions.length > MAX_INSTRUCTIONS * 0.9
                        ? 'text-accent-warning'
                        : 'text-text-tertiary'
                    )}>
                      {instructions.length}/{MAX_INSTRUCTIONS}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            isLoading={saving}
            disabled={!hasChanges || !isValid || loading}
          >
            Save Strategy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
