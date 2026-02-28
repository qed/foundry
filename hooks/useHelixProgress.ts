'use client'

import { useState, useEffect, useCallback } from 'react'

interface StageProgress {
  stageNumber: number
  stageTitle: string
  completedSteps: number
  totalSteps: number
}

interface HelixProgress {
  stages: StageProgress[]
  totalCompleted: number
  totalSteps: number
  percentage: number
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useHelixProgress(projectId: string): HelixProgress {
  const [stages, setStages] = useState<StageProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/helix/projects/${projectId}/progress`)
      if (!res.ok) throw new Error('Failed to fetch progress')
      const data = await res.json()
      setStages(data.stages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  const totalCompleted = stages.reduce((sum, s) => sum + s.completedSteps, 0)
  const totalSteps = stages.reduce((sum, s) => sum + s.totalSteps, 0)
  const percentage = totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0

  return {
    stages,
    totalCompleted,
    totalSteps,
    percentage,
    isLoading,
    error,
    refresh: fetchProgress,
  }
}
