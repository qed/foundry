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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TreeNode } from './feature-tree'

interface TreeNodeRowProps {
  node: TreeNode
  depth: number
  expandedIds: Set<string>
  selectedNodeId: string | null
  editingNodeId: string | null
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
}

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
  onToggleExpand,
  onSelectNode,
  onAddChild,
  onContextMenu,
  onTitleSave,
  onTitleCancel,
}: TreeNodeRowProps) {
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedNodeId === node.id
  const isEditing = editingNodeId === node.id
  const hasChildren = node.children.length > 0
  const LevelIcon = LEVEL_ICONS[node.level]
  const paddingLeft = depth * 16 + 8

  // Inline edit state
  const [editValue, setEditValue] = useState(node.title === 'Untitled' ? '' : node.title)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

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
      <div
        className={cn(
          'flex items-center gap-1.5 py-1.5 pr-2 cursor-pointer transition-colors group',
          isSelected
            ? 'bg-accent-cyan/10 border-l-2 border-accent-cyan'
            : 'border-l-2 border-transparent hover:bg-bg-tertiary'
        )}
        style={{ paddingLeft }}
        onClick={() => !isEditing && onSelectNode(node.id)}
        onContextMenu={(e) => onContextMenu(e, node.id, node.level, node.parent_id)}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
      >
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

        {/* Status dot */}
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            STATUS_COLORS[node.status]
          )}
          title={node.status.replace('_', ' ')}
        />

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
          >
            {node.title}
          </span>
        )}

        {/* Add child button (visible on hover, hidden during edit) */}
        {!isEditing && CAN_HAVE_CHILDREN.has(node.level) && (
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

      {/* Children (if expanded) */}
      {isExpanded &&
        hasChildren &&
        node.children.map((child) => (
          <TreeNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expandedIds={expandedIds}
            selectedNodeId={selectedNodeId}
            editingNodeId={editingNodeId}
            onToggleExpand={onToggleExpand}
            onSelectNode={onSelectNode}
            onAddChild={onAddChild}
            onContextMenu={onContextMenu}
            onTitleSave={onTitleSave}
            onTitleCancel={onTitleCancel}
          />
        ))}
    </>
  )
})
