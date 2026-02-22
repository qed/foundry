'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import type { WorkOrder, WorkOrderStatus } from '@/types/database'

interface KanbanBoardProps {
  workOrders: WorkOrder[]
  onWorkOrderClick?: (id: string) => void
  onStatusChange?: (workOrderId: string, newStatus: WorkOrderStatus) => void
}

const COLUMNS: { key: WorkOrderStatus; label: string; headerColor: string; dotBg: string }[] = [
  { key: 'backlog', label: 'Backlog', headerColor: 'text-text-tertiary', dotBg: 'bg-text-tertiary' },
  { key: 'ready', label: 'Ready', headerColor: 'text-text-secondary', dotBg: 'bg-text-secondary' },
  { key: 'in_progress', label: 'In Progress', headerColor: 'text-accent-cyan', dotBg: 'bg-accent-cyan' },
  { key: 'in_review', label: 'In Review', headerColor: 'text-accent-purple', dotBg: 'bg-accent-purple' },
  { key: 'done', label: 'Done', headerColor: 'text-accent-success', dotBg: 'bg-accent-success' },
]

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-accent-error',
  high: 'bg-accent-warning',
  medium: 'bg-accent-cyan',
  low: 'bg-text-tertiary',
}

export function KanbanBoard({
  workOrders,
  onWorkOrderClick,
  onStatusChange,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [optimisticMoves, setOptimisticMoves] = useState<Record<string, WorkOrderStatus>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const effectiveOrders = useMemo(
    () =>
      workOrders.map((wo) =>
        optimisticMoves[wo.id] ? { ...wo, status: optimisticMoves[wo.id] } : wo
      ),
    [workOrders, optimisticMoves]
  )

  const activeCard = activeId
    ? effectiveOrders.find((wo) => wo.id === activeId)
    : null

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event

      if (!over) return

      const workOrderId = active.id as string
      const newStatus = over.id as WorkOrderStatus
      const current = workOrders.find((wo) => wo.id === workOrderId)

      if (!current || current.status === newStatus) return

      // Optimistic move
      setOptimisticMoves((prev) => ({ ...prev, [workOrderId]: newStatus }))

      // Call parent handler (which does the PATCH)
      onStatusChange?.(workOrderId, newStatus)

      // Clear optimistic move after a delay (real data will come from refetch)
      setTimeout(() => {
        setOptimisticMoves((prev) => {
          const next = { ...prev }
          delete next[workOrderId]
          return next
        })
      }, 3000)
    },
    [workOrders, onStatusChange]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex gap-3 p-4 overflow-x-auto">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            column={col}
            workOrders={effectiveOrders.filter((wo) => wo.status === col.key)}
            isDragging={activeId !== null}
            onCardClick={onWorkOrderClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <CardContent workOrder={activeCard} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

/* ── Column ─────────────────────────────────────────────────────── */

function KanbanColumn({
  column,
  workOrders,
  isDragging,
  onCardClick,
}: {
  column: (typeof COLUMNS)[number]
  workOrders: WorkOrder[]
  isDragging: boolean
  onCardClick?: (id: string) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.key })

  return (
    <div className="flex-shrink-0 w-[260px] flex flex-col" ref={setNodeRef}>
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full', column.dotBg)} />
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              column.headerColor
            )}
          >
            {column.label}
          </span>
        </div>
        <span className="text-[10px] text-text-tertiary bg-bg-tertiary rounded-full px-1.5 py-0.5">
          {workOrders.length}
        </span>
      </div>

      {/* Column body */}
      <div
        className={cn(
          'flex-1 rounded-lg border p-2 min-h-[200px] max-h-[calc(100vh-220px)] overflow-y-auto transition-colors',
          isOver && isDragging
            ? 'bg-accent-cyan/5 border-accent-cyan/30'
            : 'bg-bg-primary/50 border-border-default/50'
        )}
      >
        {workOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[80px]">
            <p className="text-xs text-text-tertiary">
              {isDragging ? 'Drop here' : 'No work orders'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {workOrders.map((wo) => (
              <DraggableCard
                key={wo.id}
                workOrder={wo}
                onClick={() => onCardClick?.(wo.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Draggable Card ─────────────────────────────────────────────── */

function DraggableCard({
  workOrder,
  onClick,
}: {
  workOrder: WorkOrder
  onClick: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: workOrder.id })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Don't open detail if the card was dragged
        if (!isDragging) {
          e.stopPropagation()
          onClick()
        }
      }}
      className={cn(
        'touch-none',
        isDragging && 'opacity-30'
      )}
    >
      <CardContent workOrder={workOrder} />
    </div>
  )
}

/* ── Card Content (shared between real card and drag overlay) ──── */

function CardContent({
  workOrder,
  isDragOverlay,
}: {
  workOrder: WorkOrder
  isDragOverlay?: boolean
}) {
  const acLines = workOrder.acceptance_criteria
    ? workOrder.acceptance_criteria
        .split('\n')
        .filter((l) => l.trim()).length
    : 0

  return (
    <div
      className={cn(
        'glass-panel rounded-lg p-3 cursor-pointer hover:border-accent-cyan/30 transition-colors',
        isDragOverlay && 'shadow-lg shadow-black/30 border-accent-cyan/40 rotate-1'
      )}
    >
      <p className="text-sm text-text-primary font-medium line-clamp-2 leading-snug">
        {workOrder.title}
      </p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              PRIORITY_COLORS[workOrder.priority] || 'bg-text-tertiary'
            )}
          />
          <span className="text-[10px] text-text-tertiary capitalize">
            {workOrder.priority}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {acLines > 0 && (
            <span className="text-[10px] text-text-tertiary">
              {acLines} AC
            </span>
          )}
          {workOrder.assignee_id && (
            <Avatar
              src={undefined}
              alt="Assignee"
              initials="?"
              size="sm"
              className="!w-5 !h-5 !text-[8px]"
            />
          )}
        </div>
      </div>
    </div>
  )
}
