'use client'

import { useState, useEffect } from 'react'
import { useProject } from '@/lib/context/project-context'
import { useOrg } from '@/lib/context/org-context'
import { supabase } from '@/lib/supabase/client'

interface HelixModeToggleProps {
  onToggled?: () => void
  showProgress?: boolean
}

interface HelixProgress {
  totalSteps: number
  completedSteps: number
  percentage: number
}

export function HelixModeToggle({ onToggled, showProgress = false }: HelixModeToggleProps) {
  const { project } = useProject()
  const { org } = useOrg()
  const [isToggling, setIsToggling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<HelixProgress | null>(null)

  const isHelix = project.mode === 'helix'

  // Load progress data when in helix mode (needed for toggle logic + optional display)
  useEffect(() => {
    if (!isHelix) {
      setProgress(null)
      return
    }

    async function loadProgress() {
      const { data: steps } = await supabase
        .from('helix_steps')
        .select('status')
        .eq('project_id', project.id)

      if (steps) {
        const total = steps.length
        const completed = steps.filter((s) => s.status === 'complete').length
        setProgress({
          totalSteps: total,
          completedSteps: completed,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        })
      }
    }

    loadProgress()
  }, [isHelix, project.id])

  const handleToggle = async () => {
    if (isHelix) {
      // Skip confirmation when nothing has been started (no completed steps)
      if (!progress || progress.completedSteps === 0) {
        await doToggle()
        return
      }
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
      // Navigate to the correct dashboard for the new mode
      const base = `/org/${org.slug}/project/${project.id}`
      window.location.href = newMode === 'helix' ? `${base}/helix` : base
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
          Open
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
          Helix
        </span>
      </div>

      {/* Progress indicator */}
      {showProgress && isHelix && progress && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>{progress.completedSteps}/{progress.totalSteps} steps</span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-cyan rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

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
          {progress && progress.completedSteps > 0 && (
            <div className="mb-3 p-2 bg-bg-tertiary rounded text-xs text-text-secondary">
              Current progress: {progress.completedSteps}/{progress.totalSteps} steps ({progress.percentage}%)
            </div>
          )}
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
