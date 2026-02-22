'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trees } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { TreeNodeRow } from './tree-node-row'

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

  if (tree.length === 0) {
    return (
      <div className={cn('py-6 text-center', className)}>
        <Trees className="w-8 h-8 text-text-tertiary mx-auto mb-2 opacity-50" />
        <p className="text-xs text-text-tertiary">
          No features yet. Create an Epic to start building your feature tree.
        </p>
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
          onToggleExpand={handleToggleExpand}
          onSelectNode={onSelectNode}
        />
      ))}
    </div>
  )
}
