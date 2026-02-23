'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface DriftAlertBannerProps {
  projectId: string
  blueprintId: string
  onViewAlerts?: () => void
}

export function DriftAlertBanner({ projectId, blueprintId, onViewAlerts }: DriftAlertBannerProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/drift-alerts?blueprintId=${blueprintId}&status=new`
        )
        if (!res.ok) return
        const data = await res.json()
        const newCount = (data.alerts || []).length
        // Also count acknowledged
        const res2 = await fetch(
          `/api/projects/${projectId}/drift-alerts?blueprintId=${blueprintId}&status=acknowledged`
        )
        if (res2.ok) {
          const data2 = await res2.json()
          setCount(newCount + (data2.alerts || []).length)
        } else {
          setCount(newCount)
        }
      } catch {
        // Silently ignore
      }
    }
    fetchCount()
  }, [projectId, blueprintId])

  if (count === 0) return null

  return (
    <button
      onClick={onViewAlerts}
      className="w-full flex items-center gap-2 px-4 py-1.5 bg-accent-warning/10 border-b border-accent-warning/20 text-accent-warning text-xs hover:bg-accent-warning/15 transition-colors"
    >
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        This blueprint has {count} drift alert{count !== 1 ? 's' : ''}. Requirements may have changed.
      </span>
      <span className="ml-auto text-[10px] underline">Review</span>
    </button>
  )
}
