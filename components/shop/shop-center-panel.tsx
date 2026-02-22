'use client'

import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ProductOverviewEditor } from './product-overview-editor'

interface ShopCenterPanelProps {
  selectedNodeId: string | null
  projectId: string
}

export function ShopCenterPanel({ selectedNodeId, projectId }: ShopCenterPanelProps) {
  if (!selectedNodeId) {
    return (
      <div className="flex-1 flex items-center justify-center min-w-0">
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="Select a feature to view its requirements"
          description="Choose a feature from the tree on the left, or click Product Overview to edit the product description."
        />
      </div>
    )
  }

  // Product Overview
  if (selectedNodeId === 'product-overview') {
    return <ProductOverviewEditor projectId={projectId} />
  }

  // Feature node selected — placeholder for Phase 033+ (Feature Requirements Document)
  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Toolbar */}
      <div className="h-12 flex items-center gap-3 px-4 border-b border-border-default bg-bg-secondary flex-shrink-0">
        <span className="text-sm font-medium text-text-primary truncate">
          Feature Requirements
        </span>
        <div className="flex-1" />
        <span className="text-xs text-text-tertiary">0 words</span>
      </div>

      {/* Editor area placeholder */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-text-tertiary text-sm">
            The feature requirements editor will be built in Phase 033+.
          </p>
        </div>
      </div>
    </div>
  )
}
