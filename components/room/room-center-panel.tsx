'use client'

import { useCallback } from 'react'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { BlueprintEditor } from './blueprint-editor'
import type { Blueprint } from '@/types/database'
import type { JSONContent } from '@tiptap/react'

interface RoomCenterPanelProps {
  projectId: string
  blueprint: Blueprint | null
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-text-tertiary/10 text-text-tertiary',
  in_review: 'bg-accent-warning/10 text-accent-warning',
  approved: 'bg-accent-success/10 text-accent-success',
  implemented: 'bg-accent-cyan/10 text-accent-cyan',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  implemented: 'Implemented',
}

const TYPE_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  system_diagram: 'System Diagram',
  feature: 'Feature',
}

export function RoomCenterPanel({ projectId, blueprint }: RoomCenterPanelProps) {
  const handleSave = useCallback(async (content: JSONContent) => {
    if (!blueprint) return
    const res = await fetch(`/api/projects/${projectId}/blueprints/${blueprint.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) throw new Error('Save failed')
  }, [projectId, blueprint])

  if (!blueprint) {
    return (
      <div className="flex-1 flex items-center justify-center min-w-0">
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="Select a blueprint to view"
          description="Choose a blueprint from the panel on the left, or create a new one to get started."
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Type / Title / Status header */}
      <div className="h-10 flex items-center gap-3 px-4 border-b border-border-default bg-bg-secondary flex-shrink-0">
        <span className="text-[10px] text-text-tertiary uppercase tracking-wide">
          {TYPE_LABELS[blueprint.blueprint_type] || blueprint.blueprint_type}
        </span>
        <span className="text-text-tertiary">/</span>
        <span className="text-sm font-medium text-text-primary truncate">
          {blueprint.title}
        </span>
        <div className="flex-1" />
        <span
          className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded-full',
            STATUS_STYLES[blueprint.status] || ''
          )}
        >
          {STATUS_LABELS[blueprint.status] || blueprint.status}
        </span>
      </div>

      {/* Editor */}
      <BlueprintEditor
        key={blueprint.id}
        content={blueprint.content as JSONContent | null}
        onSave={handleSave}
      />
    </div>
  )
}
