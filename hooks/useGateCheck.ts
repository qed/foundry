'use client'

import { useState, useCallback } from 'react'
import type { GateCheckResult } from '@/lib/helix/gate-check'

type CheckType = 'complete-step' | 'activate-step' | 'pass-gate'

interface UseGateCheckReturn {
  result: GateCheckResult | null
  isChecking: boolean
  error: string | null
  checkStepCompletion: (projectId: string, stepKey: string) => Promise<GateCheckResult | null>
  checkStepActivation: (projectId: string, stepKey: string) => Promise<GateCheckResult | null>
  checkStageGate: (projectId: string, stageNumber: number) => Promise<GateCheckResult | null>
  reset: () => void
}

export function useGateCheck(): UseGateCheckReturn {
  const [result, setResult] = useState<GateCheckResult | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const performCheck = useCallback(
    async (
      projectId: string,
      checkType: CheckType,
      extra: { stepKey?: string; stageNumber?: number }
    ): Promise<GateCheckResult | null> => {
      try {
        setIsChecking(true)
        setError(null)

        const res = await fetch('/api/helix/gate-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, checkType, ...extra }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Gate check failed')
        }

        const data: GateCheckResult = await res.json()
        setResult(data)
        return data
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gate check failed'
        setError(msg)
        return null
      } finally {
        setIsChecking(false)
      }
    },
    []
  )

  const checkStepCompletion = useCallback(
    (projectId: string, stepKey: string) =>
      performCheck(projectId, 'complete-step', { stepKey }),
    [performCheck]
  )

  const checkStepActivation = useCallback(
    (projectId: string, stepKey: string) =>
      performCheck(projectId, 'activate-step', { stepKey }),
    [performCheck]
  )

  const checkStageGate = useCallback(
    (projectId: string, stageNumber: number) =>
      performCheck(projectId, 'pass-gate', { stageNumber }),
    [performCheck]
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    result,
    isChecking,
    error,
    checkStepCompletion,
    checkStepActivation,
    checkStageGate,
    reset,
  }
}
