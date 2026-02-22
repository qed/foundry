'use client'

import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ProductOverviewEditor } from './product-overview-editor'
import { FeatureRequirementEditor } from './feature-requirement-editor'

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

  // Feature node selected — show Feature Requirements Document
  return (
    <FeatureRequirementEditor
      key={selectedNodeId}
      projectId={projectId}
      featureNodeId={selectedNodeId}
    />
  )
}
