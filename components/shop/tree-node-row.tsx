'use client'

import { memo, useState, useRef, useEffect } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Puzzle,
  Layers,
  CheckCircle2,
  Plus,
  GripVertical,
  Circle,
} from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { TreeNode } from './feature-tree'

type FeatureStatus = TreeNode['status']

interface DropTargetState {
  nodeId: string
  zone: 'before' | 'on' | 'after'
  valid: boolean
}

interface TreeNodeRowProps {
  node: TreeNode
  depth: number
  expandedIds: Set<string>
  selectedNodeId: string | null
  editingNodeId: string | null
  draggedNodeId: string | null
  dropTarget: DropTargetState | null
  onToggleExpand: (nodeId: string) => void
  onSelectNode: (nodeId: string) => void
  onAddChild: (parentId: string, parentLevel: TreeNode['level']) => void
  onContextMenu: (
    e: React.MouseEvent,
    nodeId: string,
    nodeLevel: TreeNode['level'],
    parentId: string | null
  ) => void
  onTitleSave: (nodeId: string, title: string) => void
  onTitleCancel: (nodeId: string, hasTitle: boolean) => void
  onDoubleClick?: (nodeId: string) => void
  onStatusChange?: (nodeId: string, status: FeatureStatus) => void
}

const STATUS_OPTIONS: { value: FeatureStatus; label: string; dotClass: string }[] = [
  { value: 'not_started', label: 'Not Started', dotClass: 'bg-text-tertiary' },
  { value: 'in_progress', label: 'In Progress', dotClass: 'bg-accent-cyan' },
  { value: 'complete', label: 'Complete', dotClass: 'bg-accent-success' },
  { value: 'blocked', label: 'Blocked', dotClass: 'bg-accent-error' },
]

const LEVEL_ICONS = {
  epic: FolderOpen,
  feature: Puzzle,
  sub_feature: Layers,
  task: CheckCircle2,
} as const

const STATUS_COLORS = {
  not_started: 'bg-text-tertiary',
  in_progress: 'bg-accent-cyan',
  complete: 'bg-accent-success',
  blocked: 'bg-accent-error',
} as const

const STATUS_ICON_COLORS = {
  not_started: 'text-text-tertiary',
  in_progress: 'text-accent-cyan',
  complete: 'text-accent-success',
  blocked: 'text-accent-error',
} as const

const CAN_HAVE_CHILDREN = new Set(['epic', 'feature', 'sub_feature'])

export const TreeNodeRow = memo(function TreeNodeRow({
  node,
  depth,
  expandedIds,
  selectedNodeId,
  editingNodeId,
  draggedNodeId,
  dropTarget,
  onToggleExpand,
  onSelectNode,
  onAddChild,
  onContextMenu,
  onTitleSave,
  onTitleCancel,
  onDoubleClick,
  onStatusChange,
}: TreeNodeRowProps) {
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedNodeId === node.id
  const isEditing = editingNodeId === node.id
  const isDragged = draggedNodeId === node.id
  const hasChildren = node.children.length > 0
  const LevelIcon = LEVEL_ICONS[node.level]
  const paddingLeft = depth * 16 + 8

  // Drag-and-drop
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
    data: { node },
    disabled: isEditing,
  })

  // Three drop zones per node: before, on (reparent), after
  const { setNodeRef: setBeforeRef } = useDroppable({ id: `${node.id}-zone-before` })
  const { setNodeRef: setOnRef } = useDroppable({ id: `${node.id}-zone-on` })
  const { setNodeRef: setAfterRef } = useDroppable({ id: `${node.id}-zone-after` })

  const isDropBefore = dropTarget?.nodeId === node.id && dropTarget.zone === 'before'
  const isDropOn = dropTarget?.nodeId === node.id && dropTarget.zone === 'on'
  const isDropAfter = dropTarget?.nodeId === node.id && dropTarget.zone === 'after'
  const isDropValid = dropTarget?.nodeId === node.id ? dropTarget.valid : true

  // Inline edit state
  const [editValue, setEditValue] = useState(node.title === 'Untitled' ? '' : node.title)
  const inputRef = useRef<HTMLInputElement>(null)

  // Status dropdown state
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Close status dropdown on click outside
  useEffect(() => {
    if (!statusOpen) return
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [statusOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onTitleSave(node.id, editValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onTitleCancel(node.id, node.title !== 'Untitled' && node.title.trim().length > 0)
    }
  }

  const handleBlur = () => {
    onTitleSave(node.id, editValue)
  }

  return (
    <>
      {/* Drop zone: before this node */}
      {draggedNodeId && !isDragged && (
        <div
          ref={setBeforeRef}
          className="relative h-1"
          style={{ marginLeft: paddingLeft }}
        >
          {isDropBefore && (
            <div
              className={cn(
                'absolute inset-x-0 top-0 h-0.5 rounded',
                isDropValid ? 'bg-accent-success' : 'bg-accent-error'
              )}
            />
          )}
        </div>
      )}

      <div
        ref={setDragRef}
        className={cn(
          'flex items-center gap-1.5 py-1.5 pr-2 cursor-pointer transition-colors group relative',
          isSelected
            ? 'bg-accent-cyan/10 border-l-2 border-accent-cyan'
            : 'border-l-2 border-transparent hover:bg-bg-tertiary',
          isDragging && 'opacity-30',
          isDropOn && isDropValid && 'ring-1 ring-accent-success bg-accent-success/5',
          isDropOn && !isDropValid && 'ring-1 ring-accent-error bg-accent-error/5'
        )}
        style={{ paddingLeft }}
        onClick={() => !isEditing && !isDragging && onSelectNode(node.id)}
        onContextMenu={(e) => onContextMenu(e, node.id, node.level, node.parent_id)}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
      >
        {/* Drop zone: on this node (reparent) */}
        {draggedNodeId && !isDragged && (
          <div ref={setOnRef} className="absolute inset-0 z-10" />
        )}

        {/* Drag handle */}
        {!isEditing && (
          <button
            {...attributes}
            {...listeners}
            className="p-0.5 rounded hover:bg-bg-primary/50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <GripVertical className="w-3 h-3 text-text-tertiary" />
          </button>
        )}

        {/* Expand/collapse chevron */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.id)
            }}
            className="p-0.5 rounded hover:bg-bg-primary/50 transition-colors flex-shrink-0"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
            )}
          </button>
        ) : (
          <span className="w-[18px] flex-shrink-0" />
        )}

        {/* Status dot (clickable dropdown) */}
        <div ref={statusRef} className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setStatusOpen((prev) => !prev)
            }}
            className={cn(
              'w-3 h-3 rounded-full flex-shrink-0 transition-transform hover:scale-150',
              STATUS_COLORS[node.status]
            )}
            title={node.status.replace('_', ' ')}
            aria-label={`Status: ${node.status.replace('_', ' ')}`}
          />
          {statusOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 w-36 bg-bg-secondary border border-border-primary rounded-lg shadow-lg py-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation()
                    setStatusOpen(false)
                    if (opt.value !== node.status) {
                      onStatusChange?.(node.id, opt.value)
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-bg-tertiary transition-colors',
                    opt.value === node.status ? 'text-text-primary font-medium' : 'text-text-secondary'
                  )}
                >
                  <Circle
                    className={cn('w-2.5 h-2.5 flex-shrink-0', opt.dotClass.replace('bg-', 'text-'))}
                    fill={opt.value === node.status ? 'currentColor' : 'none'}
                    strokeWidth={opt.value === node.status ? 0 : 2}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Level icon */}
        <LevelIcon
          className={cn(
            'w-3.5 h-3.5 flex-shrink-0',
            STATUS_ICON_COLORS[node.status]
          )}
        />

        {/* Title or inline editor */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            placeholder="Enter node title..."
            className="flex-1 text-xs bg-bg-primary border border-accent-cyan rounded px-1.5 py-0.5 text-text-primary placeholder:text-text-tertiary outline-none focus:ring-1 focus:ring-accent-cyan min-w-0"
          />
        ) : (
          <span
            className={cn(
              'text-xs truncate flex-1',
              isSelected
                ? 'text-text-primary font-semibold'
                : 'text-text-secondary group-hover:text-text-primary'
            )}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onDoubleClick?.(node.id)
            }}
          >
            {node.title}
          </span>
        )}

        {/* Add child button (visible on hover, hidden during edit and drag) */}
        {!isEditing && !draggedNodeId && CAN_HAVE_CHILDREN.has(node.level) && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddChild(node.id, node.level)
            }}
            className="p-0.5 rounded hover:bg-bg-primary/50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
            title="Add child node"
          >
            <Plus className="w-3 h-3 text-text-tertiary hover:text-accent-cyan" />
          </button>
        )}
      </div>

      {/* Progress bar (when expanded and has children) */}
      {isExpanded && hasChildren && (() => {
        const total = node.children.length
        const complete = node.children.filter((c) => c.status === 'complete').length
        const percent = total > 0 ? Math.round((complete / total) * 100) : 0
        return (
          <div
            className="group/progress relative"
            style={{ paddingLeft: paddingLeft + 18, paddingRight: 8 }}
          >
            <div className="h-1 bg-bg-primary rounded overflow-hidden my-0.5">
              <div
                className="h-full bg-gradient-to-r from-accent-success to-accent-cyan transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="hidden group-hover/progress:block absolute bottom-full left-0 mb-1 bg-bg-primary border border-border-primary text-text-secondary text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-20" style={{ marginLeft: paddingLeft + 18 }}>
              {complete} of {total} complete ({percent}%)
            </div>
          </div>
        )
      })()}

      {/* Drop zone: after this node (only if no children expanded) */}
      {draggedNodeId && !isDragged && (!isExpanded || !hasChildren) && (
        <div
          ref={setAfterRef}
          className="relative h-1"
          style={{ marginLeft: paddingLeft }}
        >
          {isDropAfter && (
            <div
              className={cn(
                'absolute inset-x-0 top-0 h-0.5 rounded',
                isDropValid ? 'bg-accent-success' : 'bg-accent-error'
              )}
            />
          )}
        </div>
      )}

      {/* Children (if expanded) */}
      {isExpanded &&
        hasChildren &&
        node.children.map((child, _idx) => (
          <TreeNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expandedIds={expandedIds}
            selectedNodeId={selectedNodeId}
            editingNodeId={editingNodeId}
            draggedNodeId={draggedNodeId}
            dropTarget={dropTarget}
            onToggleExpand={onToggleExpand}
            onSelectNode={onSelectNode}
            onAddChild={onAddChild}
            onContextMenu={onContextMenu}
            onTitleSave={onTitleSave}
            onTitleCancel={onTitleCancel}
            onDoubleClick={onDoubleClick}
            onStatusChange={onStatusChange}
          />
        ))}

      {/* Drop zone: after last child (when expanded) */}
      {draggedNodeId && !isDragged && isExpanded && hasChildren && (
        <div
          ref={setAfterRef}
          className="relative h-1"
          style={{ marginLeft: paddingLeft }}
        >
          {isDropAfter && (
            <div
              className={cn(
                'absolute inset-x-0 top-0 h-0.5 rounded',
                isDropValid ? 'bg-accent-success' : 'bg-accent-error'
              )}
            />
          )}
        </div>
      )}
    </>
  )
})
