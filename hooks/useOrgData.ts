'use client'

import { useState, useEffect } from 'react'
import { useOrg } from '@/lib/context/org-context'
import { supabase } from '@/lib/supabase/client'
import type { Project } from '@/types/database'

interface UseOrgDataReturn {
  projects: Project[]
  loading: boolean
  error: Error | null
}

export function useOrgData(): UseOrgDataReturn {
  const { org } = useOrg()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .rpc('get_org_projects', { target_org_id: org.id })

        if (fetchError) throw fetchError
        setProjects((data as Project[]) ?? [])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [org.id])

  return { projects, loading, error }
}
