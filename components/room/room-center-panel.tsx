'use client'

import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import type { Blueprint } from '@/types/database'

interface RoomCenterPanelProps {
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

export function RoomCenterPanel({ blueprint }: RoomCenterPanelProps) {
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
      {/* Toolbar */}
      <div className="h-12 flex items-center gap-3 px-4 border-b border-border-default bg-bg-secondary flex-shrink-0">
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

      {/* Editor placeholder */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold text-text-primary mb-4">
            {blueprint.title}
          </h1>

          <div className="glass-panel rounded-lg p-8 text-center">
            <FileText className="w-8 h-8 text-text-tertiary/40 mx-auto mb-3" />
            <p className="text-sm text-text-tertiary mb-1">
              Blueprint editor coming in Phase 049
            </p>
            <p className="text-xs text-text-tertiary">
              The rich text editor with Mermaid diagram support will be built as a separate phase.
            </p>
          </div>

          {/* Metadata */}
          <div className="mt-6 flex items-center gap-4 text-xs text-text-tertiary">
            <span>
              Created {new Date(blueprint.created_at).toLocaleDateString()}
            </span>
            <span>
              Updated {new Date(blueprint.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
