'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Trees, Plus } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast-container'
import { TreeNodeRow } from './tree-node-row'
import { NodeContextMenu } from './node-context-menu'
import { DeleteNodeDialog } from './delete-node-dialog'
import { ChangeLevelDialog } from './change-level-dialog'
import type { FeatureLevel, FeatureStatus } from '@/types/database'
import type { FilterInfo } from './tree-search-filter'

export interface TreeNode {
  id: string
  project_id: string
  parent_id: string | null
  title: string
  description: string | null
  level: 'epic' | 'feature' | 'sub_feature' | 'task'
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked'
  position: number
  hall_idea_id: string | null
  created_at: string
  updated_at: string
  children: TreeNode[]
}

interface FeatureTreeProps {
  projectId: string
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
  className?: string
  searchQuery?: string
  selectedStatuses?: FeatureStatus[]
  selectedLevels?: FeatureLevel[]
  onFilterInfo?: (info: FilterInfo) => void
  onTreeChange?: () => void
  /** Increment to trigger an external refetch (e.g., after agent inserts nodes) */
  refreshTrigger?: number
}

interface ContextMenuState {
  nodeId: string
  nodeLevel: TreeNode['level']
  parentId: string | null
  position: { x: number; y: number }
}

interface DeleteDialogState {
  nodeId: string
  nodeTitle: string
  childCount: number
}

interface ChangeLevelState {
  nodeId: string
  nodeTitle: string
  currentLevel: FeatureLevel
  hasChildren: boolean
}

const CHILD_LEVELS: Record<string, TreeNode['level'] | null> = {
  epic: 'feature',
  feature: 'sub_feature',
  sub_feature: 'task',
  task: null,
}

const STATUS_COLORS = {
  not_started: 'bg-text-tertiary',
  in_progress: 'bg-accent-cyan',
  complete: 'bg-accent-success',
  blocked: 'bg-accent-error',
} as const

// Valid parent levels for each node level (used in DnD validation)
const VALID_PARENT_LEVELS: Record<string, (string | null)[]> = {
  epic: [null],
  feature: ['epic'],
  sub_feature: ['epic', 'feature'],
  task: ['feature', 'sub_feature'],
}

function countAllChildren(node: TreeNode): number {
  let count = node.children.length
  for (const child of node.children) {
    count += countAllChildren(child)
  }
  return count
}

// Find node in tree
function findNode(nodes: TreeNode[], nodeId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node
    const found = findNode(node.children, nodeId)
    if (found) return found
  }
  return null
}

const ALL_STATUSES: FeatureStatus[] = ['not_started', 'in_progress', 'complete', 'blocked']
const ALL_LEVELS: FeatureLevel[] = ['epic', 'feature', 'sub_feature', 'task']

export function FeatureTree({
  projectId,
  selectedNodeId,
  onSelectNode,
  className,
  searchQuery = '',
  selectedStatuses = ALL_STATUSES,
  selectedLevels = ALL_LEVELS,
  onFilterInfo,
  onTreeChange,
  refreshTrigger = 0,
}: FeatureTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [changeLevelDialog, setChangeLevelDialog] = useState<ChangeLevelState | null>(null)
  const [isChangingLevel, setIsChangingLevel] = useState(false)

  // Drag-and-drop state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    nodeId: string
    zone: 'before' | 'on' | 'after'
    valid: boolean
  } | null>(null)
  const previousTreeRef = useRef<TreeNode[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const { addToast } = useToast()

  // ── Search & Filter Logic ─────────────────────────────────
  const isFiltering =
    searchQuery.length > 0 ||
    selectedStatuses.length < 4 ||
    selectedLevels.length < 4

  const { matchingNodeIds, displayNodeIds } = useMemo(() => {
    if (!isFiltering || tree.length === 0) {
      return { matchingNodeIds: new Set<string>(), displayNodeIds: new Set<string>() }
    }

    const matching = new Set<string>()
    const lowerQ = searchQuery.toLowerCase()
    const statusSet = new Set(selectedStatuses)
    const levelSet = new Set(selectedLevels)

    // Walk tree and find matching nodes
    const walk = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        const searchMatch =
          !searchQuery ||
          node.title.toLowerCase().includes(lowerQ) ||
          (node.description?.toLowerCase().includes(lowerQ) ?? false)

        const statusMatch = statusSet.has(node.status)
        const levelMatch = levelSet.has(node.level)

        if (searchMatch && statusMatch && levelMatch) {
          matching.add(node.id)
        }
        walk(node.children)
      }
    }
    walk(tree)

    // Compute display set: matching nodes + all ancestors
    const display = new Set(matching)
    const addAncestors = (nodes: TreeNode[], parentChain: string[]) => {
      for (const node of nodes) {
        if (matching.has(node.id)) {
          for (const ancestorId of parentChain) {
            display.add(ancestorId)
          }
        }
        addAncestors(node.children, [...parentChain, node.id])
      }
    }
    addAncestors(tree, [])

    return { matchingNodeIds: matching, displayNodeIds: display }
  }, [tree, searchQuery, selectedStatuses, selectedLevels, isFiltering])

  // Compute filter counts from full tree and report to parent
  useEffect(() => {
    if (!onFilterInfo || tree.length === 0) return

    const statusCounts: Record<FeatureStatus, number> = { not_started: 0, in_progress: 0, complete: 0, blocked: 0 }
    const levelCounts: Record<FeatureLevel, number> = { epic: 0, feature: 0, sub_feature: 0, task: 0 }

    const countAll = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        statusCounts[node.status]++
        levelCounts[node.level]++
        countAll(node.children)
      }
    }
    countAll(tree)

    onFilterInfo({
      matchCount: isFiltering ? matchingNodeIds.size : 0,
      statusCounts,
      levelCounts,
    })
  }, [tree, matchingNodeIds, isFiltering, onFilterInfo])

  // Auto-expand ancestors of matching nodes during search
  useEffect(() => {
    if (!isFiltering || displayNodeIds.size === 0) return

    setExpandedIds((prev) => {
      const next = new Set(prev)
      for (const id of displayNodeIds) {
        if (!matchingNodeIds.has(id)) {
          // This is an ancestor — expand it
          next.add(id)
        }
      }
      return next
    })
  }, [displayNodeIds, matchingNodeIds, isFiltering])

  const onTreeChangeRef = useRef(onTreeChange)
  useEffect(() => {
    onTreeChangeRef.current = onTreeChange
  }, [onTreeChange])

  const fetchTree = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/projects/${projectId}/feature-tree`)
      if (!res.ok) throw new Error('Failed to fetch feature tree')
      const data = await res.json()
      setTree(data.nodes)
      onTreeChangeRef.current?.()
    } catch (err) {
      console.error('Error fetching feature tree:', err)
      setError('Failed to load feature tree')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchTree()
  }, [fetchTree])

  // Refetch when externally triggered (e.g., agent inserts nodes)
  const prevTriggerRef = useRef(refreshTrigger)
  useEffect(() => {
    if (refreshTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = refreshTrigger
      fetchTree()
    }
  }, [refreshTrigger, fetchTree])

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  // Create a new node via API, refetch tree, enter edit mode
  const createNode = useCallback(async (parentId: string | null) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/feature-nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '', parentId }),
      })

      if (!res.ok) {
        const data = await res.json()
        addToast(data.error || 'Failed to create node', 'error')
        return
      }

      const node = await res.json()

      // Expand the parent so the new child is visible
      if (parentId) {
        setExpandedIds((prev) => new Set(prev).add(parentId))
      }

      // Refetch tree and enter edit mode
      await fetchTree()
      setEditingNodeId(node.id)
    } catch {
      addToast('Failed to create node', 'error')
    }
  }, [projectId, fetchTree, addToast])

  // Add child to a node
  const handleAddChild = useCallback((parentId: string, parentLevel: TreeNode['level']) => {
    if (!CHILD_LEVELS[parentLevel]) {
      addToast('Tasks cannot have child nodes.', 'error')
      return
    }
    createNode(parentId)
  }, [createNode, addToast])

  // Add sibling to a node
  const handleAddSibling = useCallback((nodeParentId: string | null) => {
    createNode(nodeParentId)
  }, [createNode])

  // Add root-level epic
  const handleAddEpic = useCallback(() => {
    createNode(null)
  }, [createNode])

  // Handle context menu
  const handleContextMenu = useCallback((
    e: React.MouseEvent,
    nodeId: string,
    nodeLevel: TreeNode['level'],
    parentId: string | null
  ) => {
    e.preventDefault()
    setContextMenu({
      nodeId,
      nodeLevel,
      parentId,
      position: { x: e.clientX, y: e.clientY },
    })
  }, [])

  // Enter edit mode (from context menu or double-click)
  const handleStartEdit = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId)
  }, [])

  // Save inline title edit
  const handleTitleSave = useCallback(async (nodeId: string, title: string) => {
    setEditingNodeId(null)

    if (!title.trim()) {
      // Delete empty node
      try {
        await fetch(`/api/projects/${projectId}/feature-nodes/${nodeId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteOption: 'delete_only' }),
        })
      } catch {
        // Ignore delete errors for empty nodes
      }
      await fetchTree()
      return
    }

    // Update title via PATCH
    try {
      const res = await fetch(`/api/projects/${projectId}/feature-nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })
      if (!res.ok) {
        addToast('Failed to save title', 'error')
      }
    } catch {
      addToast('Failed to save title', 'error')
    }
    await fetchTree()
  }, [projectId, fetchTree, addToast])

  // Cancel inline edit
  const handleTitleCancel = useCallback(async (nodeId: string, hasTitle: boolean) => {
    setEditingNodeId(null)
    if (!hasTitle) {
      // Delete the empty newly-created node
      try {
        await fetch(`/api/projects/${projectId}/feature-nodes/${nodeId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteOption: 'delete_only' }),
        })
      } catch {
        // Ignore
      }
      await fetchTree()
    }
  }, [projectId, fetchTree])

  // Open delete dialog
  const handleOpenDeleteDialog = useCallback((nodeId: string) => {
    const node = findNode(tree, nodeId)
    if (!node) return
    const descendants = countAllChildren(node)
    setDeleteDialog({
      nodeId,
      nodeTitle: node.title,
      childCount: descendants,
    })
  }, [tree])

  // Confirm delete
  const handleConfirmDelete = useCallback(async (option: 'delete_only' | 'delete_subtree' | 'reparent_children') => {
    if (!deleteDialog) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/feature-nodes/${deleteDialog.nodeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteOption: option }),
      })

      if (!res.ok) {
        const data = await res.json()
        addToast(data.error || 'Failed to delete node', 'error')
        return
      }

      setDeleteDialog(null)
      await fetchTree()

      // Undo toast with 10-second window
      const deletedId = deleteDialog.nodeId
      addToast('Node deleted', 'info', 10000, {
        label: 'Undo',
        onClick: async () => {
          try {
            await fetch(`/api/projects/${projectId}/feature-nodes/${deletedId}/restore`, {
              method: 'POST',
            })
            await fetchTree()
            addToast('Node restored', 'success')
          } catch {
            addToast('Failed to restore node', 'error')
          }
        },
      })
    } catch {
      addToast('Failed to delete node', 'error')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteDialog, projectId, fetchTree, addToast])

  // Open change level dialog
  const handleOpenChangeLevelDialog = useCallback((nodeId: string) => {
    const node = findNode(tree, nodeId)
    if (!node) return
    setChangeLevelDialog({
      nodeId,
      nodeTitle: node.title,
      currentLevel: node.level,
      hasChildren: node.children.length > 0,
    })
  }, [tree])

  // Confirm level change
  const handleConfirmLevelChange = useCallback(async (newLevel: FeatureLevel) => {
    if (!changeLevelDialog) return
    setIsChangingLevel(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/feature-nodes/${changeLevelDialog.nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: newLevel }),
      })

      if (!res.ok) {
        const data = await res.json()
        addToast(data.error || 'Failed to change level', 'error')
        return
      }

      setChangeLevelDialog(null)
      await fetchTree()
      addToast('Node level changed', 'success')
    } catch {
      addToast('Failed to change level', 'error')
    } finally {
      setIsChangingLevel(false)
    }
  }, [changeLevelDialog, projectId, fetchTree, addToast])

  // ── Status Change ───────────────────────────────────────

  const handleStatusChange = useCallback(async (nodeId: string, newStatus: TreeNode['status']) => {
    // Optimistic: update status in local tree
    const updateStatus = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((n) => {
        if (n.id === nodeId) return { ...n, status: newStatus }
        return { ...n, children: updateStatus(n.children) }
      })

    const prevTree = [...tree]
    setTree(updateStatus(tree))

    try {
      const res = await fetch(`/api/projects/${projectId}/feature-nodes/${nodeId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        addToast(data.error || 'Failed to update status', 'error')
        setTree(prevTree)
        return
      }

      // Refetch to pick up cascaded parent status changes
      await fetchTree()
    } catch {
      setTree(prevTree)
      addToast('Failed to update status', 'error')
    }
  }, [tree, projectId, fetchTree, addToast])

  // ── Drag-and-Drop ────────────────────────────────────────

  // Flatten tree into a lookup map for validation
  const flattenTree = useCallback((nodes: TreeNode[]): Map<string, TreeNode> => {
    const map = new Map<string, TreeNode>()
    const walk = (ns: TreeNode[]) => {
      for (const n of ns) {
        map.set(n.id, n)
        walk(n.children)
      }
    }
    walk(nodes)
    return map
  }, [])

  // Check if nodeId is an ancestor of targetId
  const isAncestor = useCallback((nodeId: string, targetId: string, nodeMap: Map<string, TreeNode>): boolean => {
    let current = nodeMap.get(targetId)
    while (current?.parent_id) {
      if (current.parent_id === nodeId) return true
      current = nodeMap.get(current.parent_id)
    }
    return false
  }, [])

  // Check if a drop is valid
  const isValidDrop = useCallback((
    draggedId: string,
    targetId: string,
    zone: 'before' | 'on' | 'after',
    nodeMap: Map<string, TreeNode>
  ): boolean => {
    const dragged = nodeMap.get(draggedId)
    const target = nodeMap.get(targetId)
    if (!dragged || !target) return false
    if (draggedId === targetId) return false
    if (isAncestor(draggedId, targetId, nodeMap)) return false

    if (zone === 'on') {
      // Reparent: dragged becomes child of target
      if (target.level === 'task') return false // tasks can't have children
      const validParents = VALID_PARENT_LEVELS[dragged.level]
      return validParents?.includes(target.level) ?? false
    } else {
      // Before/after: dragged becomes sibling of target (same parent)
      const targetParentLevel = target.parent_id ? nodeMap.get(target.parent_id)?.level ?? null : null
      const validParents = VALID_PARENT_LEVELS[dragged.level]
      return validParents?.includes(targetParentLevel) ?? false
    }
  }, [isAncestor])

  // Apply a move optimistically to the tree
  const applyMoveToTree = useCallback((
    nodes: TreeNode[],
    draggedId: string,
    targetId: string,
    zone: 'before' | 'on' | 'after'
  ): TreeNode[] => {
    // Extract the dragged node from the tree
    let draggedNode: TreeNode | null = null
    const removeNode = (ns: TreeNode[]): TreeNode[] =>
      ns.reduce<TreeNode[]>((acc, n) => {
        if (n.id === draggedId) {
          draggedNode = n
          return acc
        }
        acc.push({ ...n, children: removeNode(n.children) })
        return acc
      }, [])

    const withoutDragged = removeNode(nodes)
    if (!draggedNode) return nodes

    if (zone === 'on') {
      // Insert as first child of target
      const insertChild = (ns: TreeNode[]): TreeNode[] =>
        ns.map((n) => {
          if (n.id === targetId) {
            return { ...n, children: [{ ...draggedNode!, children: draggedNode!.children }, ...n.children] }
          }
          return { ...n, children: insertChild(n.children) }
        })
      return insertChild(withoutDragged)
    } else {
      // Insert before or after target as sibling
      const insertSibling = (ns: TreeNode[]): TreeNode[] => {
        const result: TreeNode[] = []
        for (const n of ns) {
          if (n.id === targetId) {
            if (zone === 'before') {
              result.push({ ...draggedNode!, children: draggedNode!.children })
              result.push({ ...n, children: insertSibling(n.children) })
            } else {
              result.push({ ...n, children: insertSibling(n.children) })
              result.push({ ...draggedNode!, children: draggedNode!.children })
            }
          } else {
            result.push({ ...n, children: insertSibling(n.children) })
          }
        }
        return result
      }
      return insertSibling(withoutDragged)
    }
  }, [])

  // Compute new parentId and position from the move
  const computeMoveParams = useCallback((
    targetId: string,
    zone: 'before' | 'on' | 'after',
    nodeMap: Map<string, TreeNode>,
    updatedTree: TreeNode[]
  ): { parentId: string | null; position: number } => {
    const target = nodeMap.get(targetId)
    if (!target) return { parentId: null, position: 0 }

    if (zone === 'on') {
      return { parentId: targetId, position: 0 }
    } else {
      const parentId = target.parent_id

      // For root-level nodes
      if (!parentId) {
        const idx = updatedTree.findIndex((n) => n.id === target.id)
        const pos = zone === 'before' ? idx : idx + 1
        return { parentId: null, position: Math.max(0, pos) }
      }

      // For non-root, find siblings in the updated tree
      const findParent = (ns: TreeNode[]): TreeNode | null => {
        for (const n of ns) {
          if (n.id === parentId) return n
          const found = findParent(n.children)
          if (found) return found
        }
        return null
      }
      const parentNode = findParent(updatedTree)
      if (!parentNode) return { parentId, position: 0 }

      const targetIdx = parentNode.children.findIndex((c) => c.id === target.id)
      const pos = zone === 'before' ? targetIdx : targetIdx + 1
      return { parentId, position: Math.max(0, pos) }
    }
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggedNodeId(event.active.id as string)
    setDropTarget(null)
    previousTreeRef.current = tree
  }, [tree])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) {
      setDropTarget(null)
      return
    }

    const overId = over.id as string
    // Parse zone from droppable ID: "node-{id}-before", "node-{id}-on", "node-{id}-after"
    const parts = overId.split('-zone-')
    if (parts.length !== 2) {
      setDropTarget(null)
      return
    }
    const targetNodeId = parts[0]
    const zone = parts[1] as 'before' | 'on' | 'after'
    const draggedId = active.id as string

    const nodeMap = flattenTree(tree)
    const valid = isValidDrop(draggedId, targetNodeId, zone, nodeMap)
    setDropTarget({ nodeId: targetNodeId, zone, valid })
  }, [tree, flattenTree, isValidDrop])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedNodeId(null)
    setDropTarget(null)

    if (!over) return

    const overId = over.id as string
    const parts = overId.split('-zone-')
    if (parts.length !== 2) return

    const targetNodeId = parts[0]
    const zone = parts[1] as 'before' | 'on' | 'after'
    const draggedId = active.id as string

    const nodeMap = flattenTree(tree)
    if (!isValidDrop(draggedId, targetNodeId, zone, nodeMap)) return

    // Optimistic update
    const prevTree = previousTreeRef.current
    const updatedTree = applyMoveToTree(tree, draggedId, targetNodeId, zone)
    setTree(updatedTree)

    // Compute API params
    const { parentId, position } = computeMoveParams(targetNodeId, zone, nodeMap, updatedTree)

    try {
      const res = await fetch(`/api/projects/${projectId}/feature-nodes/${draggedId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, position }),
      })

      if (!res.ok) {
        const data = await res.json()
        addToast(data.error || 'Failed to move node', 'error')
        setTree(prevTree)
        return
      }

      // Expand parent so moved node is visible
      if (parentId) {
        setExpandedIds((prev) => new Set(prev).add(parentId))
      }

      // Refetch to sync positions
      await fetchTree()

      addToast('Node moved', 'info', 5000, {
        label: 'Undo',
        onClick: async () => {
          // Undo: move back to original parent/position
          const origNode = flattenTree(prevTree).get(draggedId)
          if (!origNode) return
          try {
            await fetch(`/api/projects/${projectId}/feature-nodes/${draggedId}/move`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ parentId: origNode.parent_id, position: origNode.position }),
            })
            await fetchTree()
            addToast('Move undone', 'success')
          } catch {
            addToast('Failed to undo', 'error')
          }
        },
      })
    } catch {
      setTree(prevTree)
      addToast('Failed to move node', 'error')
    }
  }, [tree, projectId, flattenTree, isValidDrop, applyMoveToTree, computeMoveParams, fetchTree, addToast])

  const handleDragCancel = useCallback(() => {
    setDraggedNodeId(null)
    setDropTarget(null)
  }, [])

  const draggedNode = draggedNodeId ? findNode(tree, draggedNodeId) : null

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Spinner size="sm" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('py-6 text-center', className)}>
        <p className="text-xs text-accent-error mb-2">{error}</p>
        <button
          onClick={fetchTree}
          className="text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (tree.length === 0 && !editingNodeId) {
    return (
      <div className={cn('py-6 text-center', className)}>
        <Trees className="w-8 h-8 text-text-tertiary mx-auto mb-2 opacity-50" />
        <p className="text-xs text-text-tertiary mb-3">
          No features yet. Create an Epic to start building your feature tree.
        </p>
        <button
          onClick={handleAddEpic}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/10 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Epic
        </button>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={cn('py-1', className)}>
        {/* No results message */}
        {isFiltering && matchingNodeIds.size === 0 && tree.length > 0 && (
          <div className="py-4 text-center">
            <p className="text-xs text-text-tertiary">No nodes match current filters</p>
          </div>
        )}

        {tree
          .filter((node) => !isFiltering || displayNodeIds.has(node.id))
          .map((node) => (
          <TreeNodeRow
            key={node.id}
            node={node}
            depth={0}
            expandedIds={expandedIds}
            selectedNodeId={selectedNodeId}
            editingNodeId={editingNodeId}
            draggedNodeId={draggedNodeId}
            dropTarget={dropTarget}
            onToggleExpand={handleToggleExpand}
            onSelectNode={onSelectNode}
            onAddChild={handleAddChild}
            onContextMenu={handleContextMenu}
            onTitleSave={handleTitleSave}
            onTitleCancel={handleTitleCancel}
            onDoubleClick={handleStartEdit}
            onStatusChange={handleStatusChange}
            isSearchActive={isFiltering}
            matchingNodeIds={matchingNodeIds}
            displayNodeIds={displayNodeIds}
            searchQuery={searchQuery}
          />
        ))}

        {/* Add Epic button */}
        <button
          onClick={handleAddEpic}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 mt-1 text-xs text-text-tertiary hover:text-accent-cyan hover:bg-bg-tertiary rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Epic
        </button>

        {/* Context menu */}
        {contextMenu && (
          <NodeContextMenu
            position={contextMenu.position}
            canAddChild={!!CHILD_LEVELS[contextMenu.nodeLevel]}
            onAddChild={() => handleAddChild(contextMenu.nodeId, contextMenu.nodeLevel)}
            onAddSibling={() => handleAddSibling(contextMenu.parentId)}
            onEdit={() => handleStartEdit(contextMenu.nodeId)}
            onDelete={() => handleOpenDeleteDialog(contextMenu.nodeId)}
            onChangeLevel={() => handleOpenChangeLevelDialog(contextMenu.nodeId)}
            onClose={() => setContextMenu(null)}
          />
        )}

        {/* Delete dialog */}
        <DeleteNodeDialog
          open={deleteDialog !== null}
          nodeTitle={deleteDialog?.nodeTitle || ''}
          childCount={deleteDialog?.childCount || 0}
          onClose={() => setDeleteDialog(null)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />

        {/* Change level dialog */}
        <ChangeLevelDialog
          open={changeLevelDialog !== null}
          nodeTitle={changeLevelDialog?.nodeTitle || ''}
          currentLevel={changeLevelDialog?.currentLevel || 'feature'}
          hasChildren={changeLevelDialog?.hasChildren || false}
          onClose={() => setChangeLevelDialog(null)}
          onConfirm={handleConfirmLevelChange}
          isChanging={isChangingLevel}
        />
      </div>

      {/* Drag overlay - ghost card following cursor */}
      <DragOverlay dropAnimation={null}>
        {draggedNode && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-bg-secondary border border-accent-cyan/50 rounded shadow-lg text-xs text-text-primary max-w-[200px]">
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_COLORS[draggedNode.status])} />
            <span className="truncate">{draggedNode.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
