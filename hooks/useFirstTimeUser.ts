'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useOptionalAuth } from '@/lib/auth/context'

function buildKey(userId: string, module?: string) {
  return `onboarding_${module || 'global'}_${userId}`
}

const emptySubscribe = () => () => {}

/**
 * Detect if the current user has completed onboarding for a given module.
 * Stores completion state in localStorage per user + module.
 */
export function useFirstTimeUser(module?: string) {
  const auth = useOptionalAuth()
  const userId = auth?.user?.id

  const getSnapshot = useCallback(() => {
    if (!userId) return false
    return !localStorage.getItem(buildKey(userId, module))
  }, [userId, module])

  const getServerSnapshot = useCallback(() => false, [])

  const isFirstTime = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot)

  const completeOnboarding = useCallback(() => {
    if (!userId) return
    localStorage.setItem(buildKey(userId, module), 'true')
    // Force re-render by dispatching a storage event
    window.dispatchEvent(new Event('storage'))
  }, [userId, module])

  return { isFirstTime, completeOnboarding }
}
