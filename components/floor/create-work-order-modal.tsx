'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Phase } from '@/types/database'

interface ProjectMember {
  user_id: string
  role: string
  display_name: string
  avatar_url: string | null
}

interface FeatureNodeOption {
  id: string
  title: string
  level: string
}

interface CreateWorkOrderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  phases: Phase[]
  onCreated: () => void
}

const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: 'bg-accent-error' },
  { value: 'high', label: 'High', color: 'bg-accent-warning' },
  { value: 'medium', label: 'Medium', color: 'bg-accent-cyan' },
  { value: 'low', label: 'Low', color: 'bg-text-tertiary' },
]

export function CreateWorkOrderModal({
  open,
  onOpenChange,
  projectId,
  phases,
  onCreated,
}: CreateWorkOrderModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assigneeId, setAssigneeId] = useState('')
  const [phaseId, setPhaseId] = useState('')
  const [featureNodeId, setFeatureNodeId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [members, setMembers] = useState<ProjectMember[]>([])
  const [featureNodes, setFeatureNodes] = useState<FeatureNodeOption[]>([])

  // Fetch members and feature nodes when modal opens
  useEffect(() => {
    if (!open) return

    async function loadOptions() {
      const [membersRes, nodesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/members`),
        fetch(`/api/projects/${projectId}/feature-tree`),
      ])

      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(data.members || [])
      }
      if (nodesRes.ok) {
        const data = await nodesRes.json()
        // Flatten tree to list
        const flat: FeatureNodeOption[] = []
        function flatten(nodes: Array<{ id: string; title: string; level: string; children?: Array<{ id: string; title: string; level: string; children?: unknown[] }> }>, depth = 0) {
          for (const node of nodes) {
            flat.push({
              id: node.id,
              title: '  '.repeat(depth) + node.title,
              level: node.level,
            })
            if (node.children) flatten(node.children as typeof nodes, depth + 1)
          }
        }
        flatten(data.tree || [])
        setFeatureNodes(flat)
      }
    }

    loadOptions()
  }, [open, projectId])

  // Reset form when closing
  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setAcceptanceCriteria('')
      setPriority('medium')
      setAssigneeId('')
      setPhaseId('')
      setFeatureNodeId('')
      setError(null)
    }
  }, [open])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = title.trim()
    if (trimmed.length < 3) {
      setError('Title must be at least 3 characters')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || null,
          acceptance_criteria: acceptanceCriteria.trim() || null,
          priority,
          assignee_id: assigneeId || null,
          phase_id: phaseId || null,
          feature_node_id: featureNodeId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create work order')
      }

      onCreated()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work order')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-[460px] bg-bg-secondary border-l border-border-default shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-text-primary">
            New Work Order
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Title <span className="text-accent-error">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Work order title"
                maxLength={255}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                autoFocus
                disabled={isSubmitting}
              />
              <div className="flex justify-between mt-1">
                {title.trim().length > 0 && title.trim().length < 3 && (
                  <span className="text-[10px] text-accent-error">Minimum 3 characters</span>
                )}
                <span className="text-[10px] text-text-tertiary ml-auto">
                  {title.length}/255
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of work to be done"
                rows={4}
                maxLength={5000}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent resize-y"
                disabled={isSubmitting}
              />
              <span className="text-[10px] text-text-tertiary">
                {description.length}/5000
              </span>
            </div>

            {/* Acceptance Criteria */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Acceptance Criteria
              </label>
              <textarea
                value={acceptanceCriteria}
                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                placeholder="Enter criteria, one per line"
                rows={3}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent resize-y"
                disabled={isSubmitting}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Priority
              </label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    disabled={isSubmitting}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                      priority === p.value
                        ? 'border-accent-cyan bg-accent-cyan/10 text-text-primary'
                        : 'border-border-default text-text-secondary hover:bg-bg-tertiary'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', p.color)} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Phase */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Phase
              </label>
              <select
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="">Unphased</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Feature Node */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Linked Feature
              </label>
              <select
                value={featureNodeId}
                onChange={(e) => setFeatureNodeId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="">None</option>
                {featureNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mb-3 px-3 py-2 bg-accent-error/10 text-accent-error text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-default">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={title.trim().length < 3 || isSubmitting}
            >
              Create Work Order
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
