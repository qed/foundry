'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BlueprintType } from '@/types/database'
import type { DiagramType } from '@/lib/blueprints/system-diagram-template'
import { DIAGRAM_TYPE_OPTIONS } from '@/lib/blueprints/system-diagram-template'

interface CreateBlueprintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onCreated: (blueprint: { id: string; title: string; blueprint_type: BlueprintType }) => void
}

const TYPE_OPTIONS: { value: BlueprintType; label: string; description: string }[] = [
  {
    value: 'foundation',
    label: 'Foundation',
    description: 'Project-wide technical decisions and architectural principles',
  },
  {
    value: 'system_diagram',
    label: 'System Diagram',
    description: 'Architecture diagrams and system overviews',
  },
]

export function CreateBlueprintModal({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: CreateBlueprintModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<BlueprintType>('foundation')
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    setTitle('')
    setType('foundation')
    setDiagramType('flowchart')
    setError(null)
    onOpenChange(false)
  }, [onOpenChange])

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required')
      return
    }
    if (trimmedTitle.length > 255) {
      setError('Title must be 255 characters or less')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/blueprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprint_type: type,
          title: trimmedTitle,
          ...(type === 'system_diagram' && { diagram_type: diagramType }),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create blueprint')
      }

      const data = await res.json()
      onCreated(data.blueprint)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create blueprint')
    } finally {
      setIsSubmitting(false)
    }
  }, [title, type, diagramType, projectId, onCreated, handleClose])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Blueprint</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type selector */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-colors',
                    type === opt.value
                      ? 'border-accent-cyan bg-accent-cyan/5'
                      : 'border-border-default hover:border-border-default/80 hover:bg-bg-tertiary'
                  )}
                >
                  <p className={cn(
                    'text-sm font-medium',
                    type === opt.value ? 'text-accent-cyan' : 'text-text-primary'
                  )}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Diagram type selector (only for system diagrams) */}
          {type === 'system_diagram' && (
            <div>
              <label className="text-xs font-medium text-text-secondary mb-2 block">Diagram Type</label>
              <div className="grid grid-cols-2 gap-2">
                {DIAGRAM_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDiagramType(opt.value)}
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition-colors',
                      diagramType === opt.value
                        ? 'border-accent-purple bg-accent-purple/5'
                        : 'border-border-default hover:border-border-default/80 hover:bg-bg-tertiary'
                    )}
                  >
                    <p className={cn(
                      'text-xs font-medium',
                      diagramType === opt.value ? 'text-accent-purple' : 'text-text-primary'
                    )}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title input */}
          <div>
            <label htmlFor="blueprint-title" className="text-xs font-medium text-text-secondary mb-1.5 block">
              Title
            </label>
            <input
              id="blueprint-title"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isSubmitting) handleSubmit() }}
              placeholder={type === 'foundation' ? 'e.g., Backend Architecture' : 'e.g., System Overview Diagram'}
              maxLength={255}
              autoFocus
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
            />
            <div className="flex items-center justify-between mt-1">
              {error ? (
                <p className="text-xs text-accent-error">{error}</p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-text-tertiary">{title.length}/255</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!title.trim() || isSubmitting}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
