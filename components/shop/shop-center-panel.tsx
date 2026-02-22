'use client'

import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ProductOverviewEditor } from './product-overview-editor'
import { FeatureRequirementEditor } from './feature-requirement-editor'
import { TechnicalRequirementEditor } from './technical-requirement-editor'

interface ShopCenterPanelProps {
  selectedNodeId: string | null
  projectId: string
  orgSlug?: string
}

export function ShopCenterPanel({ selectedNodeId, projectId, orgSlug }: ShopCenterPanelProps) {
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

  // Technical Requirement selected
  if (selectedNodeId.startsWith('tech-req:')) {
    const docId = selectedNodeId.slice(9)
    return (
      <TechnicalRequirementEditor
        key={docId}
        projectId={projectId}
        docId={docId}
      />
    )
  }

  // Feature node selected — show Feature Requirements Document
  return (
    <FeatureRequirementEditor
      key={selectedNodeId}
      projectId={projectId}
      featureNodeId={selectedNodeId}
      orgSlug={orgSlug}
    />
  )
}
