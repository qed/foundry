'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trees, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast-container'
import { TreeNodeRow } from './tree-node-row'
import { NodeContextMenu } from './node-context-menu'

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
}

interface ContextMenuState {
  nodeId: string
  nodeLevel: TreeNode['level']
  parentId: string | null
  position: { x: number; y: number }
}

const CHILD_LEVELS: Record<string, TreeNode['level'] | null> = {
  epic: 'feature',
  feature: 'sub_feature',
  sub_feature: 'task',
  task: null,
}

export function FeatureTree({
  projectId,
  selectedNodeId,
  onSelectNode,
  className,
}: FeatureTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const { addToast } = useToast()

  const fetchTree = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/projects/${projectId}/feature-tree`)
      if (!res.ok) throw new Error('Failed to fetch feature tree')
      const data = await res.json()
      setTree(data.nodes)
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

  // Save inline title edit
  const handleTitleSave = useCallback(async (nodeId: string, title: string) => {
    setEditingNodeId(null)

    if (!title.trim()) {
      // Delete empty node
      try {
        await fetch(`/api/projects/${projectId}/feature-nodes/${nodeId}`, {
          method: 'DELETE',
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
        })
      } catch {
        // Ignore
      }
      await fetchTree()
    }
  }, [projectId, fetchTree])

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
    <div className={cn('py-1', className)}>
      {tree.map((node) => (
        <TreeNodeRow
          key={node.id}
          node={node}
          depth={0}
          expandedIds={expandedIds}
          selectedNodeId={selectedNodeId}
          editingNodeId={editingNodeId}
          onToggleExpand={handleToggleExpand}
          onSelectNode={onSelectNode}
          onAddChild={handleAddChild}
          onContextMenu={handleContextMenu}
          onTitleSave={handleTitleSave}
          onTitleCancel={handleTitleCancel}
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
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
