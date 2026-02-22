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
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { GripVertical } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { AssigneeSelector } from './assignee-selector'
import { PrioritySelector } from './priority-selector'
import type { WorkOrder, WorkOrderStatus, WorkOrderPriority } from '@/types/database'
import type { MemberInfo, FeatureInfo } from './work-order-table'

interface KanbanBoardProps {
  workOrders: WorkOrder[]
  members?: MemberInfo[]
  features?: FeatureInfo[]
  onWorkOrderClick?: (id: string) => void
  onStatusChange?: (workOrderId: string, newStatus: WorkOrderStatus) => void
  onAssignmentChange?: (workOrderId: string, assigneeId: string | null) => void
  onPriorityChange?: (workOrderId: string, priority: WorkOrderPriority) => void
  onReorder?: (items: { id: string; position: number }[]) => void
  featureProgress?: Map<string, { done: number; total: number }>
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

const COLUMN_KEYS = new Set(COLUMNS.map((c) => c.key))

export function KanbanBoard({
  workOrders,
  members = [],
  features = [],
  onWorkOrderClick,
  onStatusChange,
  onAssignmentChange,
  onPriorityChange,
  onReorder,
  featureProgress,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [optimisticMoves, setOptimisticMoves] = useState<Record<string, WorkOrderStatus>>({})
  const [assigneeOpenFor, setAssigneeOpenFor] = useState<string | null>(null)
  const [priorityOpenFor, setPriorityOpenFor] = useState<string | null>(null)

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

  // Group work orders by status column for sortable contexts
  const columnOrders = useMemo(() => {
    const map = new Map<WorkOrderStatus, WorkOrder[]>()
    for (const col of COLUMNS) {
      map.set(
        col.key,
        effectiveOrders
          .filter((wo) => wo.status === col.key)
          .sort((a, b) => a.position - b.position)
      )
    }
    return map
  }, [effectiveOrders])

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
      const overId = over.id as string
      const current = workOrders.find((wo) => wo.id === workOrderId)
      if (!current) return

      // Determine if dropping on a column or on another card
      const isColumnDrop = COLUMN_KEYS.has(overId as WorkOrderStatus)

      if (isColumnDrop) {
        // Cross-column: status change
        const newStatus = overId as WorkOrderStatus
        if (current.status === newStatus) return

        setOptimisticMoves((prev) => ({ ...prev, [workOrderId]: newStatus }))
        onStatusChange?.(workOrderId, newStatus)
        setTimeout(() => {
          setOptimisticMoves((prev) => {
            const next = { ...prev }
            delete next[workOrderId]
            return next
          })
        }, 3000)
      } else {
        // Dropping on another card
        const overCard = workOrders.find((wo) => wo.id === overId)
        if (!overCard) return

        const effectiveStatus = optimisticMoves[current.id] || current.status
        const overEffectiveStatus = optimisticMoves[overCard.id] || overCard.status

        if (effectiveStatus === overEffectiveStatus) {
          // Same column: reorder within column
          const colItems = columnOrders.get(effectiveStatus) || []
          const oldIndex = colItems.findIndex((wo) => wo.id === workOrderId)
          const newIndex = colItems.findIndex((wo) => wo.id === overId)

          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

          const reordered = arrayMove(colItems, oldIndex, newIndex)
          const updates = reordered.map((wo, i) => ({
            id: wo.id,
            position: (i + 1) * 100,
          }))
          onReorder?.(updates)
        } else {
          // Cross-column via card drop: status change
          const newStatus = overEffectiveStatus
          setOptimisticMoves((prev) => ({ ...prev, [workOrderId]: newStatus }))
          onStatusChange?.(workOrderId, newStatus)
          setTimeout(() => {
            setOptimisticMoves((prev) => {
              const next = { ...prev }
              delete next[workOrderId]
              return next
            })
          }, 3000)
        }
      }
    },
    [workOrders, optimisticMoves, columnOrders, onStatusChange, onReorder]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex gap-3 p-4 overflow-x-auto">
        {COLUMNS.map((col) => {
          const colItems = columnOrders.get(col.key) || []
          return (
            <KanbanColumn
              key={col.key}
              column={col}
              workOrders={colItems}
              isDragging={activeId !== null}
              memberMap={memberMap}
              featureMap={featureMap}
              members={members}
              onCardClick={onWorkOrderClick}
              assigneeOpenFor={assigneeOpenFor}
              onAssigneeToggle={(id) => setAssigneeOpenFor((prev) => prev === id ? null : id)}
              onAssigneeClose={() => setAssigneeOpenFor(null)}
              onAssignmentChange={onAssignmentChange}
              priorityOpenFor={priorityOpenFor}
              onPriorityToggle={(id) => setPriorityOpenFor((prev) => prev === id ? null : id)}
              onPriorityClose={() => setPriorityOpenFor(null)}
              onPriorityChange={onPriorityChange}
              featureProgress={featureProgress}
            />
          )
        })}
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
  priorityOpenFor,
  onPriorityToggle,
  onPriorityClose,
  onPriorityChange,
  featureProgress,
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
  priorityOpenFor: string | null
  onPriorityToggle: (id: string) => void
  onPriorityClose: () => void
  onPriorityChange?: (workOrderId: string, priority: WorkOrderPriority) => void
  featureProgress?: Map<string, { done: number; total: number }>
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.key })

  const itemIds = useMemo(() => workOrders.map((wo) => wo.id), [workOrders])

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
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {workOrders.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[80px]">
              <p className="text-xs text-text-tertiary">
                {isDragging ? 'Drop here' : 'No work orders'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {workOrders.map((wo) => (
                <SortableCard
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
                  priorityOpen={priorityOpenFor === wo.id}
                  onPriorityToggle={() => onPriorityToggle(wo.id)}
                  onPriorityClose={onPriorityClose}
                  onPriorityChange={onPriorityChange}
                  featureProgress={featureProgress}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}

/* ── Sortable Card ─────────────────────────────────────────────── */

function SortableCard({
  workOrder,
  memberMap,
  featureMap,
  members,
  onClick,
  assigneeOpen,
  onAssigneeToggle,
  onAssigneeClose,
  onAssignmentChange,
  priorityOpen,
  onPriorityToggle,
  onPriorityClose,
  onPriorityChange,
  featureProgress,
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
  priorityOpen: boolean
  onPriorityToggle: () => void
  onPriorityClose: () => void
  onPriorityChange?: (workOrderId: string, priority: WorkOrderPriority) => void
  featureProgress?: Map<string, { done: number; total: number }>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workOrder.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none',
        isDragging && 'opacity-30 z-10'
      )}
    >
      <CardContent
        workOrder={workOrder}
        memberMap={memberMap}
        featureMap={featureMap}
        members={members}
        onClick={onClick}
        isDragging={isDragging}
        dragListeners={listeners}
        dragAttributes={attributes}
        assigneeOpen={assigneeOpen}
        onAssigneeToggle={onAssigneeToggle}
        onAssigneeClose={onAssigneeClose}
        onAssignmentChange={onAssignmentChange}
        priorityOpen={priorityOpen}
        onPriorityToggle={onPriorityToggle}
        onPriorityClose={onPriorityClose}
        onPriorityChange={onPriorityChange}
        featureProgress={featureProgress}
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
  onClick,
  isDragging,
  dragListeners,
  dragAttributes,
  assigneeOpen,
  onAssigneeToggle,
  onAssigneeClose,
  onAssignmentChange,
  priorityOpen,
  onPriorityToggle,
  onPriorityClose,
  onPriorityChange,
  featureProgress,
}: {
  workOrder: WorkOrder
  isDragOverlay?: boolean
  memberMap: Map<string, MemberInfo>
  featureMap: Map<string, FeatureInfo>
  members?: MemberInfo[]
  onClick?: () => void
  isDragging?: boolean
  dragListeners?: ReturnType<typeof useSortable>['listeners']
  dragAttributes?: ReturnType<typeof useSortable>['attributes']
  assigneeOpen?: boolean
  onAssigneeToggle?: () => void
  onAssigneeClose?: () => void
  onAssignmentChange?: (workOrderId: string, assigneeId: string | null) => void
  priorityOpen?: boolean
  onPriorityToggle?: () => void
  onPriorityClose?: () => void
  onPriorityChange?: (workOrderId: string, priority: WorkOrderPriority) => void
  featureProgress?: Map<string, { done: number; total: number }>
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
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation()
          onClick?.()
        }
      }}
      className={cn(
        'glass-panel rounded-lg p-3 cursor-pointer transition-all duration-150 group',
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
      {/* Header: drag handle + title + priority badge */}
      <div className="flex gap-2">
        {/* Drag handle — only shown on hover, triggers drag */}
        {dragListeners && (
          <button
            {...dragListeners}
            {...dragAttributes}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5 text-text-tertiary hover:text-text-secondary"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
        <p className="text-sm text-text-primary font-medium line-clamp-2 leading-snug flex-1 min-w-0">
          {workOrder.title}
        </p>
        {/* Priority dot — clickable for inline editing */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPriorityToggle?.()
            }}
            className={cn(
              'w-2.5 h-2.5 rounded-full mt-1 transition-all',
              'hover:ring-2 hover:ring-offset-1 hover:ring-offset-bg-secondary',
              PRIORITY_COLORS[workOrder.priority] || 'bg-text-tertiary',
              workOrder.priority === 'critical' && 'hover:ring-accent-error/50',
              workOrder.priority === 'high' && 'hover:ring-accent-warning/50',
              workOrder.priority === 'medium' && 'hover:ring-accent-cyan/50',
              workOrder.priority === 'low' && 'hover:ring-text-tertiary/50',
            )}
            title={`Priority: ${PRIORITY_LABELS[workOrder.priority] || workOrder.priority} (click to change)`}
          />
          {priorityOpen && onPriorityChange && (
            <PrioritySelector
              currentPriority={workOrder.priority as WorkOrderPriority}
              onSelect={(p) => onPriorityChange(workOrder.id, p)}
              onClose={() => onPriorityClose?.()}
            />
          )}
        </div>
      </div>

      {/* Feature tag + progress */}
      {feature && (() => {
        const fp = workOrder.feature_node_id ? featureProgress?.get(workOrder.feature_node_id) : null
        const fpPct = fp && fp.total > 0 ? Math.round((fp.done / fp.total) * 100) : 0
        return (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] text-accent-purple bg-accent-purple/10 px-1.5 py-0.5 rounded truncate max-w-[140px]">
              {feature.title}
            </span>
            {fp && (
              <span className="flex items-center gap-1 flex-shrink-0">
                <span className="w-10 h-1 rounded-full bg-bg-tertiary overflow-hidden">
                  <span
                    className={cn(
                      'block h-full rounded-full transition-all',
                      fpPct >= 100 ? 'bg-accent-success' : 'bg-accent-purple'
                    )}
                    style={{ width: `${fpPct}%` }}
                  />
                </span>
                <span className="text-[9px] text-text-tertiary">{fp.done}/{fp.total}</span>
              </span>
            )}
          </div>
        )
      })()}

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
