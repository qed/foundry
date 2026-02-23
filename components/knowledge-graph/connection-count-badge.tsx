'use client'

import { useState, useEffect, useCallback } from 'react'
import { Network } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectionCountBadgeProps {
  entityType: string
  entityId: string
  projectId: string
  onClick?: () => void
  showLabel?: boolean
}

export function ConnectionCountBadge({
  entityType,
  entityId,
  projectId,
  onClick,
  showLabel = true,
}: ConnectionCountBadgeProps) {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/connections?entityType=${entityType}&entityId=${entityId}&mode=count`
      )
      if (res.ok) {
        const data = await res.json()
        return data.count || 0
      }
    } catch {
      // Ignore
    }
    return 0
  }, [projectId, entityType, entityId])

  useEffect(() => {
    async function doFetch() {
      const result = await fetchCount()
      setCount(result)
    }
    doFetch()
  }, [fetchCount])

  const colorClass =
    count === 0 ? 'text-text-tertiary' :
    count <= 3 ? 'text-accent-cyan' :
    count <= 10 ? 'text-accent-warning' :
    'text-accent-error'

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors',
        'hover:bg-bg-tertiary',
        colorClass
      )}
      title={`${count} connection${count !== 1 ? 's' : ''}`}
    >
      <Network className="w-3.5 h-3.5" />
      <span className="font-medium">{count}</span>
      {showLabel && <span className="text-text-tertiary">connections</span>}
    </button>
  )
}
