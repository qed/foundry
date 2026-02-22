'use client'

import { useEffect, useState, useCallback } from 'react'
import { FileText, ExternalLink, Plus, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-container'
import type { BlueprintStatus } from '@/types/database'

interface BlueprintInfo {
  id: string
  title: string
  status: BlueprintStatus
  created_at: string
  updated_at: string
}

interface BlueprintStatusCardProps {
  projectId: string
  featureNodeId: string
  orgSlug: string
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20',
  in_review: 'bg-accent-warning/10 text-accent-warning border-accent-warning/20',
  approved: 'bg-accent-success/10 text-accent-success border-accent-success/20',
  implemented: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  implemented: 'Implemented',
}

export function BlueprintStatusCard({ projectId, featureNodeId, orgSlug }: BlueprintStatusCardProps) {
  const [blueprint, setBlueprint] = useState<BlueprintInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/projects/${projectId}/blueprints/for-feature/${featureNodeId}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setBlueprint(data.blueprint)
        } else if (res.status === 404) {
          if (!cancelled) setBlueprint(null)
        }
      } catch {
        // Silently fail — card is supplementary
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [projectId, featureNodeId])

  const handleCreate = useCallback(async () => {
    setIsCreating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/blueprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprint_type: 'feature',
          feature_node_id: featureNodeId,
        }),
      })

      if (res.status === 409) {
        // Already exists — refetch
        const refetch = await fetch(`/api/projects/${projectId}/blueprints/for-feature/${featureNodeId}`)
        if (refetch.ok) {
          const data = await refetch.json()
          setBlueprint(data.blueprint)
        }
        addToast('Blueprint already exists for this feature', 'info')
        return
      }

      if (!res.ok) {
        addToast('Failed to create blueprint', 'error')
        return
      }

      const data = await res.json()
      setBlueprint(data.blueprint)
      addToast('Blueprint created', 'success')
    } catch {
      addToast('Failed to create blueprint', 'error')
    } finally {
      setIsCreating(false)
    }
  }, [projectId, featureNodeId, addToast])

  if (isLoading) return null

  const roomUrl = `/org/${orgSlug}/project/${projectId}/room`

  if (!blueprint) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border-default bg-bg-secondary">
        <AlertCircle className="w-3.5 h-3.5 text-accent-warning flex-shrink-0" />
        <span className="text-xs text-text-tertiary">No blueprint exists for this feature</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreate}
          isLoading={isCreating}
          className="ml-auto text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Create Blueprint
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border-default bg-bg-secondary">
      <FileText className="w-3.5 h-3.5 text-accent-purple flex-shrink-0" />
      <span className="text-xs text-text-secondary">Blueprint</span>
      <span
        className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
          STATUS_STYLES[blueprint.status] || ''
        )}
      >
        {STATUS_LABELS[blueprint.status] || blueprint.status}
      </span>
      <span className="text-[10px] text-text-tertiary">
        Updated {timeAgo(blueprint.updated_at)}
      </span>
      <a
        href={`${roomUrl}?blueprint=${blueprint.id}`}
        className="ml-auto flex items-center gap-1 text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
        title="View in Control Room"
      >
        <ExternalLink className="w-3 h-3" />
        View Blueprint
      </a>
    </div>
  )
}
