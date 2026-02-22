'use client'

import { List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KanbanBoard } from './kanban-board'
import type { WorkOrder, WorkOrderStatus } from '@/types/database'

interface FloorContentProps {
  view: 'kanban' | 'table'
  workOrders: WorkOrder[]
  selectedPhaseId: string | null
  onWorkOrderClick?: (workOrderId: string) => void
  onStatusChange?: (workOrderId: string, newStatus: WorkOrderStatus) => void
}

const TABLE_COLUMNS = ['Title', 'Status', 'Priority', 'Assignee', 'Phase', 'Feature', 'Updated']

export function FloorContent({
  view,
  workOrders,
  selectedPhaseId,
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
  return <TableView workOrders={filtered} onWorkOrderClick={onWorkOrderClick} />
}

function TableView({ workOrders, onWorkOrderClick }: { workOrders: WorkOrder[]; onWorkOrderClick?: (id: string) => void }) {
  if (workOrders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <List className="w-10 h-10 text-text-tertiary/40 mx-auto mb-3" />
          <p className="text-sm text-text-tertiary">No work orders yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-default">
            {TABLE_COLUMNS.map((col) => (
              <th
                key={col}
                className="text-left text-xs font-medium text-text-tertiary uppercase tracking-wide px-3 py-2"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {workOrders.map((wo) => (
            <tr
              key={wo.id}
              onClick={() => onWorkOrderClick?.(wo.id)}
              className="border-b border-border-default/50 hover:bg-bg-tertiary/30 transition-colors cursor-pointer"
            >
              <td className="px-3 py-2.5 text-sm text-text-primary">{wo.title}</td>
              <td className="px-3 py-2.5">
                <StatusBadge status={wo.status} />
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <PriorityDot priority={wo.priority} />
                  <span className="text-xs text-text-secondary capitalize">{wo.priority}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-xs text-text-tertiary">—</td>
              <td className="px-3 py-2.5 text-xs text-text-tertiary">—</td>
              <td className="px-3 py-2.5 text-xs text-text-tertiary">—</td>
              <td className="px-3 py-2.5 text-xs text-text-tertiary">
                {new Date(wo.updated_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-accent-error',
    high: 'bg-accent-warning',
    medium: 'bg-accent-cyan',
    low: 'bg-text-tertiary',
  }
  return <span className={cn('w-2 h-2 rounded-full flex-shrink-0', colors[priority] || 'bg-text-tertiary')} />
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    backlog: 'bg-text-tertiary/10 text-text-tertiary',
    ready: 'bg-text-secondary/10 text-text-secondary',
    in_progress: 'bg-accent-cyan/10 text-accent-cyan',
    in_review: 'bg-accent-purple/10 text-accent-purple',
    done: 'bg-accent-success/10 text-accent-success',
  }
  const labels: Record<string, string> = {
    backlog: 'Backlog',
    ready: 'Ready',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
  }
  return (
    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', styles[status] || '')}>
      {labels[status] || status}
    </span>
  )
}
