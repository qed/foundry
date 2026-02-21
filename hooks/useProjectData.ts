'use client'

import { useProject } from '@/lib/context/project-context'

interface UseProjectDataReturn {
  loading: boolean
  error: Error | null
}

export function useProjectData(): UseProjectDataReturn {
  // project context is available for future data fetching
  useProject()

  // Will be expanded in later phases to load project-scoped data
  return { loading: false, error: null }
}
