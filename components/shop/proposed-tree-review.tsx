'use client'

import { useState, useCallback } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Puzzle,
  Layers,
  CheckCircle2,
  Check,
  X,
  Pencil,
  Eye,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeatureLevel } from '@/types/database'

// --- Types ---

export interface ProposedNode {
  id: string
  title: string
  description: string
  level: FeatureLevel
  children: ProposedNode[]
}

export interface ProposedTreeStructure {
  nodes: ProposedNode[]
  summary: string
}

interface ProposedTreeReviewProps {
  tree: ProposedTreeStructure
  projectId: string
  onInserted: () => void
  onCancel: () => void
}

// --- Helpers ---

function getAllNodeIds(nodes: ProposedNode[]): string[] {
  const ids: string[] = []
  function walk(list: ProposedNode[]) {
    for (const n of list) {
      ids.push(n.id)
      walk(n.children)
    }
  }
  walk(nodes)
  return ids
}

function findNode(nodes: ProposedNode[], id: string): ProposedNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findNode(n.children, id)
    if (found) return found
  }
  return null
}

/** Check that every accepted child also has its parent accepted. */
function validateAccepted(
  nodes: ProposedNode[],
  acceptedIds: Set<string>
): { valid: boolean; orphans: string[] } {
  const orphans: string[] = []
  function walk(list: ProposedNode[], parentAccepted: boolean) {
    for (const n of list) {
      const isAccepted = acceptedIds.has(n.id)
      if (isAccepted && !parentAccepted) {
        orphans.push(n.title)
      }
      walk(n.children, isAccepted)
    }
  }
  // Root-level nodes have no parent requirement
  for (const n of nodes) {
    walk(n.children, acceptedIds.has(n.id))
  }
  return { valid: orphans.length === 0, orphans }
}

/** Flatten accepted nodes for bulk-create API in parent-before-child order. */
function flattenAccepted(
  nodes: ProposedNode[],
  acceptedIds: Set<string>,
  editedTitles: Map<string, string>
): { tempId: string; parentTempId: string | null; title: string; description: string | null; level: FeatureLevel }[] {
  const result: { tempId: string; parentTempId: string | null; title: string; description: string | null; level: FeatureLevel }[] = []
  function walk(list: ProposedNode[], parentTempId: string | null) {
    for (const n of list) {
      if (!acceptedIds.has(n.id)) continue
      result.push({
        tempId: n.id,
        parentTempId,
        title: editedTitles.get(n.id) || n.title,
        description: n.description || null,
        level: n.level,
      })
      walk(n.children, n.id)
    }
  }
  walk(nodes, null)
  return result
}

const LEVEL_ICONS: Record<FeatureLevel, typeof FolderOpen> = {
  epic: FolderOpen,
  feature: Puzzle,
  sub_feature: Layers,
  task: CheckCircle2,
}

const LEVEL_LABELS: Record<FeatureLevel, string> = {
  epic: 'Epic',
  feature: 'Feature',
  sub_feature: 'Sub-feature',
  task: 'Task',
}

// --- Node Details Modal ---

function NodeDetailsModal({
  node,
  editedTitles,
  onClose,
}: {
  node: ProposedNode
  editedTitles: Map<string, string>
  onClose: () => void
}) {
  const Icon = LEVEL_ICONS[node.level]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-secondary border border-border-default rounded-lg p-5 w-[360px] max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-accent-cyan" />
            <span className="text-xs font-medium text-accent-cyan uppercase">
              {LEVEL_LABELS[node.level]}
            </span>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          {editedTitles.get(node.id) || node.title}
        </h3>
        {node.description && (
          <p className="text-xs text-text-secondary mb-3 leading-relaxed">{node.description}</p>
        )}
        {node.children.length > 0 && (
          <>
            <p className="text-xs text-text-tertiary mb-1">
              Children ({node.children.length}):
            </p>
            <ul className="space-y-0.5">
              {node.children.map((c) => (
                <li key={c.id} className="text-xs text-text-secondary flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                  {editedTitles.get(c.id) || c.title}
                </li>
              ))}
            </ul>
          </>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full px-3 py-1.5 text-xs bg-bg-tertiary text-text-primary rounded hover:bg-bg-tertiary/80 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// --- Proposed Tree Node ---

function ProposedTreeNode({
  node,
  depth,
  acceptedIds,
  editedTitles,
  editingId,
  onToggle,
  onView,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditChange,
}: {
  node: ProposedNode
  depth: number
  acceptedIds: Set<string>
  editedTitles: Map<string, string>
  editingId: string | null
  onToggle: (id: string) => void
  onView: (id: string) => void
  onEditStart: (id: string) => void
  onEditSave: () => void
  onEditCancel: () => void
  onEditChange: (value: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const isAccepted = acceptedIds.has(node.id)
  const isEditing = editingId === node.id
  const Icon = LEVEL_ICONS[node.level]
  const displayTitle = editedTitles.get(node.id) || node.title

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-md group transition-colors',
          isAccepted
            ? 'bg-accent-success/10 border-l-2 border-accent-success'
            : 'bg-bg-tertiary/50 border-l-2 border-border-default'
        )}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        {/* Expand/collapse */}
        {node.children.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-text-tertiary hover:text-text-primary"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Checkbox */}
        <button
          onClick={() => onToggle(node.id)}
          className={cn(
            'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
            isAccepted
              ? 'bg-accent-success border-accent-success'
              : 'border-text-tertiary hover:border-text-secondary'
          )}
        >
          {isAccepted && <Check className="w-3 h-3 text-bg-primary" />}
        </button>

        {/* Level icon */}
        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', isAccepted ? 'text-accent-success' : 'text-text-tertiary')} />

        {/* Title */}
        {isEditing ? (
          <input
            type="text"
            defaultValue={displayTitle}
            autoFocus
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditSave()
              if (e.key === 'Escape') onEditCancel()
            }}
            onBlur={onEditSave}
            className="flex-1 px-1.5 py-0.5 bg-bg-primary border border-accent-cyan rounded text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
          />
        ) : (
          <span className={cn('flex-1 text-xs truncate', isAccepted ? 'text-text-primary font-medium' : 'text-text-secondary')}>
            {displayTitle}
          </span>
        )}

        {/* Level badge */}
        <span className="text-[10px] text-text-tertiary flex-shrink-0">{LEVEL_LABELS[node.level]}</span>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onView(node.id)}
            className="p-0.5 text-text-tertiary hover:text-accent-cyan"
            title="View details"
          >
            <Eye className="w-3 h-3" />
          </button>
          <button
            onClick={() => onEditStart(node.id)}
            className="p-0.5 text-text-tertiary hover:text-accent-cyan"
            title="Edit title"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded &&
        node.children.map((child) => (
          <ProposedTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            acceptedIds={acceptedIds}
            editedTitles={editedTitles}
            editingId={editingId}
            onToggle={onToggle}
            onView={onView}
            onEditStart={onEditStart}
            onEditSave={onEditSave}
            onEditCancel={onEditCancel}
            onEditChange={onEditChange}
          />
        ))}
    </>
  )
}

// --- Main Component ---

export function ProposedTreeReview({ tree, projectId, onInserted, onCancel }: ProposedTreeReviewProps) {
  const allIds = getAllNodeIds(tree.nodes)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => new Set(allIds))
  const [editedTitles, setEditedTitles] = useState<Map<string, string>>(new Map())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [inserting, setInserting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = useCallback((id: string) => {
    setAcceptedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setError(null)
  }, [])

  const handleAcceptAll = useCallback(() => {
    setAcceptedIds(new Set(allIds))
    setError(null)
  }, [allIds])

  const handleRejectAll = useCallback(() => {
    setAcceptedIds(new Set())
    setError(null)
  }, [])

  const handleEditStart = useCallback((id: string) => {
    setEditingId(id)
    setEditingValue('')
  }, [])

  const handleEditSave = useCallback(() => {
    if (editingId && editingValue.trim()) {
      setEditedTitles((prev) => {
        const next = new Map(prev)
        next.set(editingId, editingValue.trim())
        return next
      })
    }
    setEditingId(null)
    setEditingValue('')
  }, [editingId, editingValue])

  const handleEditCancel = useCallback(() => {
    setEditingId(null)
    setEditingValue('')
  }, [])

  const handleInsert = useCallback(async () => {
    // Validate: no orphaned children
    const { valid, orphans } = validateAccepted(tree.nodes, acceptedIds)
    if (!valid) {
      setError(`Cannot accept children without their parent: ${orphans.join(', ')}`)
      return
    }

    const flatNodes = flattenAccepted(tree.nodes, acceptedIds, editedTitles)
    if (flatNodes.length === 0) {
      setError('No nodes selected for insertion')
      return
    }

    setInserting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/feature-nodes/bulk-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: flatNodes }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to insert nodes' }))
        throw new Error(data.error || 'Failed to insert nodes')
      }

      await res.json()
      onInserted()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to insert nodes')
    } finally {
      setInserting(false)
    }
  }, [tree.nodes, acceptedIds, editedTitles, projectId, onInserted])

  const viewingNode = viewingId ? findNode(tree.nodes, viewingId) : null

  return (
    <div className="bg-bg-tertiary/50 border border-border-default rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-default bg-accent-cyan/5">
        <h4 className="text-xs font-semibold text-accent-cyan">Proposed Feature Tree</h4>
        <p className="text-[10px] text-text-tertiary mt-0.5">{tree.summary}</p>
      </div>

      {/* Tree */}
      <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
        {tree.nodes.map((node) => (
          <ProposedTreeNode
            key={node.id}
            node={node}
            depth={0}
            acceptedIds={acceptedIds}
            editedTitles={editedTitles}
            editingId={editingId}
            onToggle={handleToggle}
            onView={setViewingId}
            onEditStart={handleEditStart}
            onEditSave={handleEditSave}
            onEditCancel={handleEditCancel}
            onEditChange={setEditingValue}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 px-2 py-1.5 bg-accent-error/10 border border-accent-error/30 rounded text-[10px] text-accent-error">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2 border-t border-border-default flex items-center gap-2 flex-wrap">
        <button
          onClick={handleAcceptAll}
          className="text-[10px] px-2 py-1 text-accent-cyan hover:text-accent-cyan/80 transition-colors"
        >
          Accept All
        </button>
        <button
          onClick={handleRejectAll}
          className="text-[10px] px-2 py-1 text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Reject All
        </button>
        <div className="flex-1" />
        <button
          onClick={onCancel}
          disabled={inserting}
          className="px-2.5 py-1 text-[10px] border border-border-default text-text-secondary rounded hover:bg-bg-tertiary transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleInsert}
          disabled={inserting || acceptedIds.size === 0}
          className="px-2.5 py-1 text-[10px] bg-accent-cyan text-bg-primary rounded hover:bg-accent-cyan/90 transition-colors disabled:opacity-30 flex items-center gap-1"
        >
          {inserting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Inserting...
            </>
          ) : (
            `Insert ${acceptedIds.size} Node${acceptedIds.size !== 1 ? 's' : ''}`
          )}
        </button>
      </div>

      {/* Node details modal */}
      {viewingNode && (
        <NodeDetailsModal
          node={viewingNode}
          editedTitles={editedTitles}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  )
}
