'use client'

import { memo } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Puzzle,
  Layers,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TreeNode } from './feature-tree'

interface TreeNodeRowProps {
  node: TreeNode
  depth: number
  expandedIds: Set<string>
  selectedNodeId: string | null
  onToggleExpand: (nodeId: string) => void
  onSelectNode: (nodeId: string) => void
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

export const TreeNodeRow = memo(function TreeNodeRow({
  node,
  depth,
  expandedIds,
  selectedNodeId,
  onToggleExpand,
  onSelectNode,
}: TreeNodeRowProps) {
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedNodeId === node.id
  const hasChildren = node.children.length > 0
  const LevelIcon = LEVEL_ICONS[node.level]
  const paddingLeft = depth * 16 + 8 // 8px base + 16px per depth level

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
        onClick={() => onSelectNode(node.id)}
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

        {/* Title */}
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
            onToggleExpand={onToggleExpand}
            onSelectNode={onSelectNode}
          />
        ))}
    </>
  )
})
