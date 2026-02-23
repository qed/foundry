'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn, timeAgo } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast-container'

const MAX_LENGTH = 2000

const PLACEHOLDER_EXAMPLES = [
  'Write in formal, regulatory-compliant tone',
  'Keep descriptions concise (under 200 words)',
  'Include security considerations for each requirement',
  'Format all code examples in TypeScript',
  'Always include acceptance criteria in GIVEN/WHEN/THEN format',
].join('\n')

interface AgentInstructionsConfigProps {
  projectId: string
}

export function AgentInstructionsConfig({ projectId }: AgentInstructionsConfigProps) {
  const { addToast } = useToast()
  const [instructions, setInstructions] = useState('')
  const [savedInstructions, setSavedInstructions] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty = instructions !== savedInstructions

  // Load current instructions
  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/projects/${projectId}/settings/agent-instructions`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setInstructions(data.instructions || '')
        setSavedInstructions(data.instructions || '')
        setUpdatedAt(data.updatedAt)
      } catch {
        setError('Failed to load agent instructions')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [projectId])

  const handleSave = useCallback(async () => {
    if (isSaving) return

    if (instructions.length > MAX_LENGTH) {
      addToast(`Instructions must be ${MAX_LENGTH} characters or less`, 'error')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings/agent-instructions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: instructions || null }),
      })

      if (!res.ok) {
        const data = await res.json()
        addToast(data.error || 'Failed to save', 'error')
        return
      }

      const data = await res.json()
      setSavedInstructions(data.instructions || '')
      setInstructions(data.instructions || '')
      setUpdatedAt(data.updatedAt)
      addToast('Agent instructions saved', 'success')
    } catch {
      addToast('Failed to save instructions', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [projectId, instructions, isSaving, addToast])

  if (isLoading) {
    return (
      <div className="glass-panel rounded-xl p-6 flex items-center justify-center min-h-[200px]">
        <Spinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <p className="text-accent-error text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-text-primary">
          Pattern Shop Agent — Custom Writing Instructions
        </h3>
        <p className="text-sm text-text-tertiary mt-1">
          These instructions are injected into the Pattern Shop Agent&apos;s system prompt.
          Use them to customize tone, style, and documentation standards for generated requirements.
        </p>
      </div>

      {/* Textarea */}
      <div className="space-y-1.5">
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={PLACEHOLDER_EXAMPLES}
          rows={8}
          className={cn(
            'w-full rounded-lg bg-bg-tertiary border border-border-default px-3 py-2 text-sm text-text-primary',
            'placeholder:text-text-tertiary/50 resize-y',
            'focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent',
            instructions.length > MAX_LENGTH && 'ring-2 ring-accent-error border-accent-error'
          )}
        />
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-xs',
              instructions.length > MAX_LENGTH ? 'text-accent-error' : 'text-text-tertiary'
            )}
          >
            {instructions.length}/{MAX_LENGTH} characters
          </span>
          {updatedAt && (
            <span className="text-xs text-text-tertiary">
              Last updated: {timeAgo(updatedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving || instructions.length > MAX_LENGTH}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            isDirty && instructions.length <= MAX_LENGTH
              ? 'bg-accent-cyan text-bg-primary hover:bg-accent-cyan/80'
              : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
          )}
        >
          {isSaving ? <Spinner size="sm" /> : 'Save Instructions'}
        </button>
        {isDirty && (
          <button
            onClick={() => setInstructions(savedInstructions)}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Discard changes
          </button>
        )}
      </div>
    </div>
  )
}
