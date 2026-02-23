'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface SyncAlertsBannerProps {
  projectId: string
  workOrderId: string
  onViewAlerts: () => void
}

export function SyncAlertsBanner({ projectId, workOrderId, onViewAlerts }: SyncAlertsBannerProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/work-orders/${workOrderId}/sync-alerts?status=new`
        )
        if (!res.ok) return
        const data = await res.json()
        const newCount = (data.alerts || []).length

        // Also count acknowledged (still unresolved)
        const res2 = await fetch(
          `/api/projects/${projectId}/work-orders/${workOrderId}/sync-alerts?status=acknowledged`
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
  }, [projectId, workOrderId])

  if (count === 0) return null

  return (
    <button
      onClick={onViewAlerts}
      className="w-full flex items-center gap-2 px-5 py-2 bg-accent-warning/10 border-b border-accent-warning/20 text-accent-warning text-xs hover:bg-accent-warning/15 transition-colors"
    >
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        Blueprint updated. {count} sync alert{count !== 1 ? 's' : ''} to review.
      </span>
      <span className="ml-auto text-[10px] underline">Review changes</span>
    </button>
  )
}
