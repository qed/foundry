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
import { AssigneeSelector } from './assignee-selector'
import type { WorkOrder, WorkOrderStatus } from '@/types/database'
import type { MemberInfo, FeatureInfo } from './work-order-table'

interface KanbanBoardProps {
  workOrders: WorkOrder[]
  members?: MemberInfo[]
  features?: FeatureInfo[]
  onWorkOrderClick?: (id: string) => void
  onStatusChange?: (workOrderId: string, newStatus: WorkOrderStatus) => void
  onAssignmentChange?: (workOrderId: string, assigneeId: string | null) => void
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

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const STATUS_BORDER: Record<string, string> = {
  in_progress: 'border-l-accent-cyan',
  in_review: 'border-l-accent-purple',
  done: 'border-l-accent-success',
}

export function KanbanBoard({
  workOrders,
  members = [],
  features = [],
  onWorkOrderClick,
  onStatusChange,
  onAssignmentChange,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [optimisticMoves, setOptimisticMoves] = useState<Record<string, WorkOrderStatus>>({})
  const [assigneeOpenFor, setAssigneeOpenFor] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  // Build lookup maps
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.user_id, m])),
    [members]
  )
  const featureMap = useMemo(
    () => new Map(features.map((f) => [f.id, f])),
    [features]
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
            memberMap={memberMap}
            featureMap={featureMap}
            members={members}
            onCardClick={onWorkOrderClick}
            assigneeOpenFor={assigneeOpenFor}
            onAssigneeToggle={(id) => setAssigneeOpenFor((prev) => prev === id ? null : id)}
            onAssigneeClose={() => setAssigneeOpenFor(null)}
            onAssignmentChange={onAssignmentChange}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <CardContent
            workOrder={activeCard}
            isDragOverlay
            memberMap={memberMap}
            featureMap={featureMap}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

/* ── Column ─────────────────────────────────────────────────────── */

function KanbanColumn({
  column,
  workOrders,
  isDragging,
  memberMap,
  featureMap,
  members,
  onCardClick,
  assigneeOpenFor,
  onAssigneeToggle,
  onAssigneeClose,
  onAssignmentChange,
}: {
  column: (typeof COLUMNS)[number]
  workOrders: WorkOrder[]
  isDragging: boolean
  memberMap: Map<string, MemberInfo>
  featureMap: Map<string, FeatureInfo>
  members: MemberInfo[]
  onCardClick?: (id: string) => void
  assigneeOpenFor: string | null
  onAssigneeToggle: (id: string) => void
  onAssigneeClose: () => void
  onAssignmentChange?: (workOrderId: string, assigneeId: string | null) => void
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
                memberMap={memberMap}
                featureMap={featureMap}
                members={members}
                onClick={() => onCardClick?.(wo.id)}
                assigneeOpen={assigneeOpenFor === wo.id}
                onAssigneeToggle={() => onAssigneeToggle(wo.id)}
                onAssigneeClose={onAssigneeClose}
                onAssignmentChange={onAssignmentChange}
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
  memberMap,
  featureMap,
  members,
  onClick,
  assigneeOpen,
  onAssigneeToggle,
  onAssigneeClose,
  onAssignmentChange,
}: {
  workOrder: WorkOrder
  memberMap: Map<string, MemberInfo>
  featureMap: Map<string, FeatureInfo>
  members: MemberInfo[]
  onClick: () => void
  assigneeOpen: boolean
  onAssigneeToggle: () => void
  onAssigneeClose: () => void
  onAssignmentChange?: (workOrderId: string, assigneeId: string | null) => void
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
      <CardContent
        workOrder={workOrder}
        memberMap={memberMap}
        featureMap={featureMap}
        members={members}
        assigneeOpen={assigneeOpen}
        onAssigneeToggle={onAssigneeToggle}
        onAssigneeClose={onAssigneeClose}
        onAssignmentChange={onAssignmentChange}
      />
    </div>
  )
}

/* ── Card Content (shared between real card and drag overlay) ──── */

function CardContent({
  workOrder,
  isDragOverlay,
  memberMap,
  featureMap,
  members,
  assigneeOpen,
  onAssigneeToggle,
  onAssigneeClose,
  onAssignmentChange,
}: {
  workOrder: WorkOrder
  isDragOverlay?: boolean
  memberMap: Map<string, MemberInfo>
  featureMap: Map<string, FeatureInfo>
  members?: MemberInfo[]
  assigneeOpen?: boolean
  onAssigneeToggle?: () => void
  onAssigneeClose?: () => void
  onAssignmentChange?: (workOrderId: string, assigneeId: string | null) => void
}) {
  const acLines = workOrder.acceptance_criteria
    ? workOrder.acceptance_criteria
        .split('\n')
        .filter((l) => l.trim()).length
    : 0

  const assignee = workOrder.assignee_id
    ? memberMap.get(workOrder.assignee_id)
    : null

  const feature = workOrder.feature_node_id
    ? featureMap.get(workOrder.feature_node_id)
    : null

  const isDone = workOrder.status === 'done'
  const statusBorder = STATUS_BORDER[workOrder.status]

  // Build initials from display name
  const initials = assignee
    ? assignee.display_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  return (
    <div
      className={cn(
        'glass-panel rounded-lg p-3 cursor-pointer transition-all duration-150',
        'hover:border-accent-cyan/30 hover:shadow-md hover:shadow-black/10',
        'focus-visible:outline-2 focus-visible:outline-accent-cyan focus-visible:outline-offset-1',
        isDragOverlay && 'shadow-lg shadow-black/30 border-accent-cyan/40 rotate-1',
        isDone && 'opacity-80',
        statusBorder && `border-l-2 ${statusBorder}`
      )}
      tabIndex={0}
      role="button"
      aria-label={`Work order: ${workOrder.title}`}
    >
      {/* Header: title + priority badge */}
      <div className="flex gap-2">
        <p className="text-sm text-text-primary font-medium line-clamp-2 leading-snug flex-1 min-w-0">
          {workOrder.title}
        </p>
        <span
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0 mt-1',
            PRIORITY_COLORS[workOrder.priority] || 'bg-text-tertiary'
          )}
          title={PRIORITY_LABELS[workOrder.priority] || workOrder.priority}
        />
      </div>

      {/* Feature tag */}
      {feature && (
        <span className="inline-block text-[10px] text-accent-purple bg-accent-purple/10 px-1.5 py-0.5 rounded mt-1.5 max-w-full truncate">
          {feature.title}
        </span>
      )}

      {/* Footer: priority label, AC count, assignee */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-text-tertiary capitalize">
          {workOrder.priority}
        </span>
        <div className="flex items-center gap-2">
          {acLines > 0 && (
            <span className="text-[10px] text-text-tertiary">
              {acLines} AC
            </span>
          )}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAssigneeToggle?.()
              }}
              className="rounded-full hover:ring-2 hover:ring-accent-cyan/40 transition-all"
              title={assignee ? assignee.display_name : 'Assign member'}
            >
              {assignee ? (
                <Avatar
                  src={assignee.avatar_url || undefined}
                  alt={assignee.display_name}
                  initials={initials}
                  size="sm"
                  className="!w-5 !h-5 !text-[8px]"
                />
              ) : (
                <span className="flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-text-tertiary text-[10px] text-text-tertiary hover:border-accent-cyan hover:text-accent-cyan transition-colors">
                  +
                </span>
              )}
            </button>
            {assigneeOpen && members && onAssignmentChange && (
              <AssigneeSelector
                members={members}
                currentAssigneeId={workOrder.assignee_id}
                onSelect={(assigneeId) => onAssignmentChange(workOrder.id, assigneeId)}
                onClose={() => onAssigneeClose?.()}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
