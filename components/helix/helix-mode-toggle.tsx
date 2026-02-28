'use client'

import { useState } from 'react'
import { useProject } from '@/lib/context/project-context'

interface HelixModeToggleProps {
  onToggled?: () => void
}

export function HelixModeToggle({ onToggled }: HelixModeToggleProps) {
  const { project } = useProject()
  const [isToggling, setIsToggling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isHelix = project.mode === 'helix'

  const handleToggle = async () => {
    if (isHelix) {
      // Show confirmation when switching away from Helix
      setShowConfirm(true)
      return
    }
    await doToggle()
  }

  const doToggle = async () => {
    try {
      setIsToggling(true)
      setError(null)
      setShowConfirm(false)

      const newMode = isHelix ? 'open' : 'helix'
      const res = await fetch(`/api/projects/${project.id}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to toggle mode')
      }

      onToggled?.()
      // Reload to reflect new mode state
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle mode')
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-medium ${
            !isHelix ? 'text-text-primary' : 'text-text-secondary'
          }`}
        >
          Open Mode
        </span>
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:ring-offset-2 focus:ring-offset-bg-primary ${
            isHelix ? 'bg-accent-cyan' : 'bg-border-default'
          } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          role="switch"
          aria-checked={isHelix}
          aria-label="Toggle Helix Mode"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isHelix ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span
          className={`text-sm font-medium ${
            isHelix ? 'text-text-primary' : 'text-text-secondary'
          }`}
        >
          Helix Mode
        </span>
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}

      {showConfirm && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-50 min-w-[280px]">
          <p className="text-sm text-text-primary font-medium mb-2">
            Switch to Open Mode?
          </p>
          <p className="text-xs text-text-secondary mb-3">
            Your Helix progress will be preserved. You can switch back anytime.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border-default rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={doToggle}
              disabled={isToggling}
              className="px-3 py-1.5 text-xs bg-accent-cyan text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isToggling ? 'Switching...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
