'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Loader2,
  GitBranch,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast-container'
import type { FeedbackSubmission } from '@/types/database'

interface ConvertToFeatureModalProps {
  feedback: FeedbackSubmission
  projectId: string
  onClose: () => void
  onConverted: (updatedFeedback: FeedbackSubmission) => void
}

interface TreeNode {
  id: string
  parent_id: string | null
  title: string
  level: 'epic' | 'feature' | 'sub_feature' | 'task'
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked'
  children: TreeNode[]
}

interface FeedbackMeta {
  browser?: string
  device?: string
  page_url?: string
  [key: string]: unknown
}

const LEVEL_LABELS: Record<string, string> = {
  epic: 'Epic',
  feature: 'Feature',
  sub_feature: 'Sub-feature',
  task: 'Task',
}

const SELECTABLE_LEVELS = new Set(['epic', 'feature'])

function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0] || ''
  const firstSentence = firstLine.split(/[.!?]/)[0] || firstLine
  return firstSentence.trim().slice(0, 120)
}

function buildDescription(feedback: FeedbackSubmission): string {
  const submitter = feedback.submitter_name || feedback.submitter_email || 'Anonymous'
  const meta = (feedback.metadata || {}) as FeedbackMeta

  let desc = `## User Feedback\n${feedback.content}\n\n## Context\n`
  desc += `- Submitted by: ${submitter}\n`
  desc += `- Browser: ${meta.browser || 'Unknown'}\n`
  desc += `- Device: ${meta.device || 'Unknown'}\n`
  desc += `- Page: ${meta.page_url || 'Unknown'}\n`
  desc += `- Received: ${new Date(feedback.created_at).toISOString()}\n`
  desc += `\n## Why This Matters\n_Add notes about why this feature is important._\n`

  return desc
}

function getNodePath(nodes: TreeNode[], targetId: string): string {
  function findPath(node: TreeNode, path: string[]): string[] | null {
    const currentPath = [...path, node.title]
    if (node.id === targetId) return currentPath
    for (const child of node.children) {
      const result = findPath(child, currentPath)
      if (result) return result
    }
    return null
  }
  for (const node of nodes) {
    const path = findPath(node, [])
    if (path) return path.join(' > ')
  }
  return ''
}

export function ConvertToFeatureModal({ feedback, projectId, onClose, onConverted }: ConvertToFeatureModalProps) {
  const { addToast } = useToast()
  const [tree, setTree] = useState<TreeNode[]>([])
  const [treeLoading, setTreeLoading] = useState(true)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  const [title, setTitle] = useState(() => extractTitle(feedback.content))
  const [description, setDescription] = useState(() => buildDescription(feedback))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch feature tree
  useEffect(() => {
    async function loadTree() {
      try {
        const res = await fetch(`/api/projects/${projectId}/feature-tree`)
        if (res.ok) {
          const data = await res.json()
          setTree(data.nodes || [])
          // Auto-expand root epics
          const rootIds = new Set<string>((data.nodes || []).map((n: TreeNode) => n.id))
          setExpanded(rootIds)
        }
      } catch {
        // Tree is optional — user can still create root epic
      } finally {
        setTreeLoading(false)
      }
    }
    loadTree()
  }, [projectId])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, isSubmitting])

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    if (title.trim().length < 3) newErrors.title = 'Title must be at least 3 characters'
    if (title.trim().length > 255) newErrors.title = 'Title must be 255 characters or less'
    if (description.trim().length < 10) newErrors.description = 'Description must be at least 10 characters'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [title, description])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/feedback/${feedback.id}/convert-to-feature`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            parent_id: selectedParentId || null,
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to convert')
      }

      const data = await res.json()
      const parentPath = selectedParentId ? getNodePath(tree, selectedParentId) : 'Root'
      addToast(`Feature "${data.featureNode.title}" created in ${parentPath}`, 'success')

      if (data.feedback) {
        onConverted(data.feedback)
      }
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create feature'
      addToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [validate, projectId, feedback.id, title, description, selectedParentId, tree, addToast, onConverted, onClose])

  // Filter tree nodes by search term
  function nodeMatchesSearch(node: TreeNode, term: string): boolean {
    if (node.title.toLowerCase().includes(term.toLowerCase())) return true
    return node.children.some((c) => nodeMatchesSearch(c, term))
  }

  function renderNode(node: TreeNode): React.ReactNode {
    if (searchTerm && !nodeMatchesSearch(node, searchTerm)) return null

    const isExpanded = expanded.has(node.id)
    const isSelectable = SELECTABLE_LEVELS.has(node.level)
    const isSelected = selectedParentId === node.id
    const hasChildren = node.children.length > 0

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors',
            isSelected && 'bg-accent-cyan/10 border border-accent-cyan/30',
            isSelectable && !isSelected && 'hover:bg-bg-tertiary cursor-pointer',
            !isSelectable && 'opacity-50',
          )}
          style={{ paddingLeft: `${8}px` }}
          onClick={() => {
            if (isSelectable) setSelectedParentId(node.id)
          }}
        >
          {/* Expand toggle */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(node.id)
              }}
              className="p-0.5 hover:bg-bg-tertiary rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-text-tertiary" />
              ) : (
                <ChevronRight className="w-3 h-3 text-text-tertiary" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {/* Node title */}
          <span className={cn('flex-1 truncate', isSelected ? 'text-accent-cyan font-medium' : 'text-text-secondary')}>
            {node.title}
          </span>

          {/* Level badge */}
          <span className="text-[9px] text-text-tertiary px-1.5 py-0.5 bg-bg-tertiary rounded">
            {LEVEL_LABELS[node.level]}
          </span>

          {/* Selected check */}
          {isSelected && <Check className="w-3 h-3 text-accent-cyan" />}
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="ml-4 border-l border-border-default/50">
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    )
  }

  const selectedPath = selectedParentId ? getNodePath(tree, selectedParentId) : null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={isSubmitting ? undefined : onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-bg-secondary border border-border-default rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default flex-shrink-0">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-accent-purple" />
              <h2 className="text-sm font-semibold text-text-primary">Convert to Feature</h2>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Original feedback reference */}
            <div className="bg-accent-purple/5 border border-accent-purple/20 rounded-lg p-3">
              <p className="text-[10px] font-medium text-accent-purple uppercase tracking-wider mb-1">Original Feedback</p>
              <p className="text-xs text-text-secondary line-clamp-3">{feedback.content}</p>
            </div>

            {/* Two-column: tree + form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Feature Tree */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Select Parent Node <span className="text-text-tertiary">(optional — leave empty for new Epic)</span>
                </label>

                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search features..."
                    className="w-full pl-7 pr-3 py-1.5 bg-bg-tertiary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:border-accent-cyan transition-colors"
                  />
                </div>

                {/* Tree */}
                <div className="border border-border-default rounded-lg bg-bg-primary max-h-56 overflow-y-auto p-1.5">
                  {treeLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
                    </div>
                  ) : tree.length === 0 ? (
                    <p className="text-xs text-text-tertiary text-center py-4">No features yet — a new Epic will be created</p>
                  ) : (
                    tree.map((node) => renderNode(node))
                  )}
                </div>

                {/* Selected path */}
                {selectedPath && (
                  <div className="mt-1.5 bg-accent-cyan/5 border border-accent-cyan/20 rounded px-2 py-1">
                    <p className="text-[10px] text-accent-cyan">Parent: {selectedPath}</p>
                  </div>
                )}

                {/* Deselect */}
                {selectedParentId && (
                  <button
                    onClick={() => setSelectedParentId(null)}
                    className="mt-1 text-[10px] text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    Clear selection (create as Epic)
                  </button>
                )}
              </div>

              {/* Right: Feature details form */}
              <div className="space-y-3">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Title <span className="text-accent-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isSubmitting}
                    maxLength={255}
                    placeholder="Feature title"
                    className={cn(
                      'w-full px-3 py-2 bg-bg-tertiary border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:border-accent-cyan transition-colors',
                      errors.title ? 'border-accent-error' : 'border-border-default'
                    )}
                  />
                  <div className="flex items-center justify-between mt-1">
                    {errors.title ? (
                      <p className="text-[10px] text-accent-error flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" />
                        {errors.title}
                      </p>
                    ) : <span />}
                    <p className="text-[10px] text-text-tertiary">{title.length}/255</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Description <span className="text-accent-error">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                    rows={7}
                    placeholder="Feature description (Markdown)"
                    className={cn(
                      'w-full px-3 py-2 bg-bg-tertiary border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:border-accent-cyan transition-colors font-mono text-xs',
                      errors.description ? 'border-accent-error' : 'border-border-default'
                    )}
                  />
                  {errors.description && (
                    <p className="text-[10px] text-accent-error flex items-center gap-1 mt-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Tags (read-only display) */}
                {feedback.tags && feedback.tags.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Tags from Feedback</label>
                    <div className="flex flex-wrap gap-1.5">
                      {feedback.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default flex-shrink-0">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-accent-purple text-white text-xs font-semibold rounded-lg hover:bg-accent-purple/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Create Feature
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
