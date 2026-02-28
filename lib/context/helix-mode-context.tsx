'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useProject } from '@/lib/context/project-context'
import type { HelixStep, HelixStageGate } from '@/types/database'
import { supabase } from '@/lib/supabase/client'

interface StageProgress {
  stageNumber: number
  totalSteps: number
  completedSteps: number
  percentage: number
}

interface HelixModeContextType {
  isHelixMode: boolean
  isLoading: boolean
  toggleMode: () => Promise<void>
  currentStage: number | null
  currentStep: HelixStep | null
  allSteps: HelixStep[]
  stageGates: HelixStageGate[]
  stageProgress: StageProgress[]
  canToggleMode: boolean
  toggleError: string | null
  refreshSteps: () => Promise<void>
}

const HelixModeContext = createContext<HelixModeContextType | undefined>(undefined)

interface HelixModeProviderProps {
  children: React.ReactNode
}

export function HelixModeProvider({ children }: HelixModeProviderProps) {
  const { project } = useProject()
  const [isHelixMode, setIsHelixMode] = useState(project.mode === 'helix')
  const [isLoading, setIsLoading] = useState(true)
  const [allSteps, setAllSteps] = useState<HelixStep[]>([])
  const [stageGates, setStageGates] = useState<HelixStageGate[]>([])
  const [toggleError, setToggleError] = useState<string | null>(null)

  const loadHelixData = useCallback(async () => {
    if (!isHelixMode) {
      setAllSteps([])
      setStageGates([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const [stepsResult, gatesResult] = await Promise.all([
        supabase
          .from('helix_steps')
          .select('*')
          .eq('project_id', project.id)
          .order('stage_number', { ascending: true })
          .order('step_number', { ascending: true }),
        supabase
          .from('helix_stage_gates')
          .select('*')
          .eq('project_id', project.id)
          .order('stage_number', { ascending: true }),
      ])

      if (stepsResult.error) throw stepsResult.error
      if (gatesResult.error) throw gatesResult.error

      setAllSteps(stepsResult.data || [])
      setStageGates(gatesResult.data || [])
    } catch {
      setToggleError('Failed to load Helix data')
    } finally {
      setIsLoading(false)
    }
  }, [isHelixMode, project.id])

  useEffect(() => {
    loadHelixData()
  }, [loadHelixData])

  const refreshSteps = useCallback(async () => {
    await loadHelixData()
  }, [loadHelixData])

  const toggleMode = useCallback(async () => {
    try {
      setToggleError(null)
      const newMode = isHelixMode ? 'open' : 'helix'
      const res = await fetch(`/api/projects/${project.id}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to toggle mode')
      }

      setIsHelixMode(newMode === 'helix')
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'Failed to toggle mode')
    }
  }, [isHelixMode, project.id])

  // Derive current stage from active steps
  const currentStage = allSteps.find((s) => s.status === 'active')?.stage_number ?? null

  const currentStep = allSteps.find((s) => s.status === 'active') ?? null

  const stageProgress: StageProgress[] = React.useMemo(() => {
    const stageMap = new Map<number, { total: number; completed: number }>()
    for (const step of allSteps) {
      const existing = stageMap.get(step.stage_number) || { total: 0, completed: 0 }
      existing.total++
      if (step.status === 'complete') existing.completed++
      stageMap.set(step.stage_number, existing)
    }
    return Array.from(stageMap.entries()).map(([stageNumber, { total, completed }]) => ({
      stageNumber,
      totalSteps: total,
      completedSteps: completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }))
  }, [allSteps])

  return (
    <HelixModeContext.Provider
      value={{
        isHelixMode,
        isLoading,
        toggleMode,
        currentStage,
        currentStep,
        allSteps,
        stageGates,
        stageProgress,
        canToggleMode: true,
        toggleError,
        refreshSteps,
      }}
    >
      {children}
    </HelixModeContext.Provider>
  )
}

export function useHelixMode() {
  const context = useContext(HelixModeContext)
  if (context === undefined) {
    throw new Error('useHelixMode must be used within HelixModeProvider')
  }
  return context
}

export function useOptionalHelixMode() {
  return useContext(HelixModeContext)
}
