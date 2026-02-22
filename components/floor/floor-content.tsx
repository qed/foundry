'use client'

import { KanbanBoard } from './kanban-board'
import { WorkOrderTable } from './work-order-table'
import type { WorkOrder, WorkOrderStatus, Phase } from '@/types/database'
import type { MemberInfo, FeatureInfo } from './work-order-table'

interface FloorContentProps {
  view: 'kanban' | 'table'
  workOrders: WorkOrder[]
  phases: Phase[]
  members: MemberInfo[]
  features: FeatureInfo[]
  selectedPhaseId: string | null
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onWorkOrderClick?: (workOrderId: string) => void
  onStatusChange?: (workOrderId: string, newStatus: WorkOrderStatus) => void
}

export function FloorContent({
  view,
  workOrders,
  phases,
  members,
  features,
  selectedPhaseId,
  selectedIds,
  onSelectionChange,
  onWorkOrderClick,
  onStatusChange,
}: FloorContentProps) {
  const filtered = selectedPhaseId
    ? workOrders.filter((wo) => wo.phase_id === selectedPhaseId)
    : workOrders

  if (view === 'kanban') {
    return (
      <KanbanBoard
        workOrders={filtered}
        onWorkOrderClick={onWorkOrderClick}
        onStatusChange={onStatusChange}
      />
    )
  }

  return (
    <WorkOrderTable
      workOrders={filtered}
      phases={phases}
      members={members}
      features={features}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      onWorkOrderClick={onWorkOrderClick}
    />
  )
}
