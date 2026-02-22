'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  Pencil,
  Check,
  ChevronDown,
  User,
  Clock,
  MessageSquare,
  Activity,
  FileText,
  ListChecks,
  ClipboardList,
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { Avatar } from '@/components/ui/avatar'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
import type { WorkOrder, WorkOrderStatus, WorkOrderPriority, Phase } from '@/types/database'

interface ProjectMember {
  user_id: string
  role: string
  display_name: string
  avatar_url: string | null
}

interface EnrichedWorkOrder extends WorkOrder {
  creator: { id: string; display_name: string; avatar_url: string | null } | null
  assignee: { id: string; display_name: string; avatar_url: string | null } | null
  phase: { id: string; name: string; status: string } | null
  feature_node: { id: string; title: string; level: string } | null
}

interface ActivityEntry {
  id: string
  work_order_id: string
  user_id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
  user: { display_name: string; avatar_url: string | null }
}

interface WorkOrderDetailProps {
  workOrderId: string | null
  open: boolean
  onClose: () => void
  projectId: string
  phases: Phase[]
  onWorkOrderUpdated?: () => void
}

const STATUS_OPTIONS: { value: WorkOrderStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-text-tertiary/10 text-text-tertiary' },
  { value: 'ready', label: 'Ready', color: 'bg-text-secondary/10 text-text-secondary' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-accent-cyan/10 text-accent-cyan' },
  { value: 'in_review', label: 'In Review', color: 'bg-accent-purple/10 text-accent-purple' },
  { value: 'done', label: 'Done', color: 'bg-accent-success/10 text-accent-success' },
]

const PRIORITY_OPTIONS: { value: WorkOrderPriority; label: string; dotColor: string }[] = [
  { value: 'critical', label: 'Critical', dotColor: 'bg-accent-error' },
  { value: 'high', label: 'High', dotColor: 'bg-accent-warning' },
  { value: 'medium', label: 'Medium', dotColor: 'bg-accent-cyan' },
  { value: 'low', label: 'Low', dotColor: 'bg-text-tertiary' },
]

export function WorkOrderDetail({
  workOrderId,
  open,
  onClose,
  projectId,
  phases,
  onWorkOrderUpdated,
}: WorkOrderDetailProps) {
  const [workOrder, setWorkOrder] = useState<EnrichedWorkOrder | null>(null)
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline edit states
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [editingCriteria, setEditingCriteria] = useState(false)
  const [criteriaDraft, setCriteriaDraft] = useState('')
  const [editingPlan, setEditingPlan] = useState(false)
  const [planDraft, setPlanDraft] = useState('')

  // Dropdown states
  const [statusOpen, setStatusOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [phaseOpen, setPhaseOpen] = useState(false)

  const titleInputRef = useRef<HTMLInputElement>(null)

  const fetchWorkOrder = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const [woRes, actRes, memRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/work-orders/${id}`),
        fetch(`/api/projects/${projectId}/work-orders/${id}/activity`),
        fetch(`/api/projects/${projectId}/members`),
      ])

      if (!woRes.ok) throw new Error('Work order not found')
      const woData = await woRes.json()
      setWorkOrder(woData)

      if (actRes.ok) {
        const actData = await actRes.json()
        setActivities(actData.activities || [])
      }

      if (memRes.ok) {
        const memData = await memRes.json()
        setMembers(memData.members || [])
      }
    } catch (err) {
      console.error('Error fetching work order:', err)
      setError('Failed to load work order')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open && workOrderId) {
      fetchWorkOrder(workOrderId)
    }
    if (!open) {
      setWorkOrder(null)
      setActivities([])
      setEditingTitle(false)
      setEditingDescription(false)
      setEditingCriteria(false)
      setEditingPlan(false)
      setStatusOpen(false)
      setPriorityOpen(false)
      setAssigneeOpen(false)
      setPhaseOpen(false)
    }
  }, [open, workOrderId, fetchWorkOrder])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  // Focus title input when editing
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingTitle])

  const patchWorkOrder = useCallback(async (fields: Record<string, unknown>) => {
    if (!workOrder) return
    try {
      const res = await fetch(`/api/projects/${projectId}/work-orders/${workOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Update failed')
      }
      // Refetch to get enriched data
      await fetchWorkOrder(workOrder.id)
      onWorkOrderUpdated?.()
    } catch (err) {
      console.error('Error updating work order:', err)
    }
  }, [workOrder, projectId, fetchWorkOrder, onWorkOrderUpdated])

  const handleTitleSave = useCallback(() => {
    const trimmed = titleDraft.trim()
    if (trimmed.length >= 3 && trimmed !== workOrder?.title) {
      // Optimistic update
      setWorkOrder((prev) => prev ? { ...prev, title: trimmed } : prev)
      patchWorkOrder({ title: trimmed })
    }
    setEditingTitle(false)
  }, [titleDraft, workOrder?.title, patchWorkOrder])

  const handleStatusChange = useCallback((status: WorkOrderStatus) => {
    setWorkOrder((prev) => prev ? { ...prev, status } : prev)
    patchWorkOrder({ status })
    setStatusOpen(false)
  }, [patchWorkOrder])

  const handlePriorityChange = useCallback((priority: WorkOrderPriority) => {
    setWorkOrder((prev) => prev ? { ...prev, priority } : prev)
    patchWorkOrder({ priority })
    setPriorityOpen(false)
  }, [patchWorkOrder])

  const handleAssigneeChange = useCallback((assigneeId: string | null) => {
    const assignee = assigneeId
      ? members.find((m) => m.user_id === assigneeId)
      : null
    setWorkOrder((prev) => prev
      ? {
          ...prev,
          assignee_id: assigneeId,
          assignee: assignee
            ? { id: assignee.user_id, display_name: assignee.display_name, avatar_url: assignee.avatar_url }
            : null,
        }
      : prev
    )
    patchWorkOrder({ assignee_id: assigneeId || null })
    setAssigneeOpen(false)
  }, [members, patchWorkOrder])

  const handlePhaseChange = useCallback((phaseId: string | null) => {
    const phase = phaseId ? phases.find((p) => p.id === phaseId) : null
    setWorkOrder((prev) => prev
      ? {
          ...prev,
          phase_id: phaseId,
          phase: phase ? { id: phase.id, name: phase.name, status: phase.status } : null,
        }
      : prev
    )
    patchWorkOrder({ phase_id: phaseId || null })
    setPhaseOpen(false)
  }, [phases, patchWorkOrder])

  const handleDescriptionSave = useCallback(() => {
    if (descriptionDraft !== (workOrder?.description || '')) {
      setWorkOrder((prev) => prev ? { ...prev, description: descriptionDraft || null } : prev)
      patchWorkOrder({ description: descriptionDraft || null })
    }
    setEditingDescription(false)
  }, [descriptionDraft, workOrder?.description, patchWorkOrder])

  const handleCriteriaSave = useCallback(() => {
    if (criteriaDraft !== (workOrder?.acceptance_criteria || '')) {
      setWorkOrder((prev) => prev ? { ...prev, acceptance_criteria: criteriaDraft || null } : prev)
      patchWorkOrder({ acceptance_criteria: criteriaDraft || null })
    }
    setEditingCriteria(false)
  }, [criteriaDraft, workOrder?.acceptance_criteria, patchWorkOrder])

  const handlePlanSave = useCallback(() => {
    if (planDraft !== (workOrder?.implementation_plan || '')) {
      setWorkOrder((prev) => prev ? { ...prev, implementation_plan: planDraft || null } : prev)
      patchWorkOrder({ implementation_plan: planDraft || null })
    }
    setEditingPlan(false)
  }, [planDraft, workOrder?.implementation_plan, patchWorkOrder])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-[560px] bg-bg-secondary border-l border-border-default shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="w-4 h-4 text-accent-cyan flex-shrink-0" />
            <span className="text-xs text-text-tertiary">Work Order</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-accent-error mb-2">{error}</p>
              <button
                onClick={() => workOrderId && fetchWorkOrder(workOrderId)}
                className="text-xs text-accent-cyan hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : workOrder ? (
          <div className="flex-1 overflow-y-auto">
            {/* Title */}
            <div className="px-5 pt-4 pb-2">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSave()
                      if (e.key === 'Escape') setEditingTitle(false)
                    }}
                    maxLength={255}
                    className="flex-1 px-2 py-1 bg-bg-primary border border-border-default rounded text-base font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
                  />
                  <button
                    onClick={handleTitleSave}
                    className="p-1 rounded text-accent-success hover:bg-accent-success/10"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="group flex items-start gap-2 cursor-pointer"
                  onClick={() => {
                    setTitleDraft(workOrder.title)
                    setEditingTitle(true)
                  }}
                >
                  <h2 className="text-base font-semibold text-text-primary leading-snug">
                    {workOrder.title}
                  </h2>
                  <Pencil className="w-3.5 h-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                </div>
              )}
            </div>

            {/* Status + Priority row */}
            <div className="px-5 pb-3 flex items-center gap-3 flex-wrap">
              {/* Status dropdown */}
              <InlineDropdown
                open={statusOpen}
                onToggle={() => setStatusOpen(!statusOpen)}
                onClose={() => setStatusOpen(false)}
                trigger={
                  <span className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer inline-flex items-center gap-1',
                    STATUS_OPTIONS.find((s) => s.value === workOrder.status)?.color
                  )}>
                    {STATUS_OPTIONS.find((s) => s.value === workOrder.status)?.label}
                    <ChevronDown className="w-3 h-3" />
                  </span>
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs hover:bg-bg-tertiary transition-colors flex items-center gap-2',
                      workOrder.status === s.value && 'bg-bg-tertiary'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', s.color.split(' ')[0])} />
                    {s.label}
                  </button>
                ))}
              </InlineDropdown>

              {/* Priority dropdown */}
              <InlineDropdown
                open={priorityOpen}
                onToggle={() => setPriorityOpen(!priorityOpen)}
                onClose={() => setPriorityOpen(false)}
                trigger={
                  <span className="text-xs text-text-secondary cursor-pointer inline-flex items-center gap-1.5 hover:text-text-primary transition-colors">
                    <span className={cn('w-2 h-2 rounded-full', PRIORITY_OPTIONS.find((p) => p.value === workOrder.priority)?.dotColor)} />
                    {PRIORITY_OPTIONS.find((p) => p.value === workOrder.priority)?.label}
                    <ChevronDown className="w-3 h-3" />
                  </span>
                }
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePriorityChange(p.value)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs hover:bg-bg-tertiary transition-colors flex items-center gap-2',
                      workOrder.priority === p.value && 'bg-bg-tertiary'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', p.dotColor)} />
                    {p.label}
                  </button>
                ))}
              </InlineDropdown>
            </div>

            {/* Metadata grid */}
            <div className="px-5 pb-4 grid grid-cols-2 gap-y-2.5 gap-x-4">
              {/* Assignee */}
              <MetadataItem label="Assignee" icon={<User className="w-3 h-3" />}>
                <InlineDropdown
                  open={assigneeOpen}
                  onToggle={() => setAssigneeOpen(!assigneeOpen)}
                  onClose={() => setAssigneeOpen(false)}
                  trigger={
                    <span className="text-xs text-text-primary cursor-pointer hover:text-accent-cyan transition-colors inline-flex items-center gap-1.5">
                      {workOrder.assignee ? (
                        <>
                          <Avatar
                            src={workOrder.assignee.avatar_url || undefined}
                            alt={workOrder.assignee.display_name}
                            initials={getInitials(workOrder.assignee.display_name)}
                            size="sm"
                          />
                          {workOrder.assignee.display_name}
                        </>
                      ) : (
                        <span className="text-text-tertiary">Unassigned</span>
                      )}
                      <ChevronDown className="w-3 h-3 text-text-tertiary" />
                    </span>
                  }
                >
                  <button
                    onClick={() => handleAssigneeChange(null)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs hover:bg-bg-tertiary transition-colors',
                      !workOrder.assignee_id && 'bg-bg-tertiary'
                    )}
                  >
                    Unassigned
                  </button>
                  {members.map((m) => (
                    <button
                      key={m.user_id}
                      onClick={() => handleAssigneeChange(m.user_id)}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs hover:bg-bg-tertiary transition-colors flex items-center gap-2',
                        workOrder.assignee_id === m.user_id && 'bg-bg-tertiary'
                      )}
                    >
                      <Avatar src={m.avatar_url || undefined} alt={m.display_name} initials={getInitials(m.display_name)} size="sm" />
                      {m.display_name}
                    </button>
                  ))}
                </InlineDropdown>
              </MetadataItem>

              {/* Phase */}
              <MetadataItem label="Phase" icon={<Clock className="w-3 h-3" />}>
                <InlineDropdown
                  open={phaseOpen}
                  onToggle={() => setPhaseOpen(!phaseOpen)}
                  onClose={() => setPhaseOpen(false)}
                  trigger={
                    <span className="text-xs text-text-primary cursor-pointer hover:text-accent-cyan transition-colors inline-flex items-center gap-1">
                      {workOrder.phase?.name || <span className="text-text-tertiary">Unphased</span>}
                      <ChevronDown className="w-3 h-3 text-text-tertiary" />
                    </span>
                  }
                >
                  <button
                    onClick={() => handlePhaseChange(null)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs hover:bg-bg-tertiary transition-colors',
                      !workOrder.phase_id && 'bg-bg-tertiary'
                    )}
                  >
                    Unphased
                  </button>
                  {phases.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePhaseChange(p.id)}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs hover:bg-bg-tertiary transition-colors',
                        workOrder.phase_id === p.id && 'bg-bg-tertiary'
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </InlineDropdown>
              </MetadataItem>

              {/* Feature */}
              <MetadataItem label="Feature" icon={<FileText className="w-3 h-3" />}>
                <span className="text-xs text-text-tertiary">
                  {workOrder.feature_node?.title || 'No feature linked'}
                </span>
              </MetadataItem>

              {/* Created by */}
              <MetadataItem label="Created" icon={<Clock className="w-3 h-3" />}>
                <span className="text-xs text-text-tertiary">
                  {workOrder.creator?.display_name || 'Unknown'}{' '}
                  · {timeAgo(workOrder.created_at)}
                </span>
              </MetadataItem>
            </div>

            <div className="border-t border-border-default" />

            {/* Description */}
            <EditableSection
              label="Description"
              icon={<FileText className="w-3.5 h-3.5" />}
              content={workOrder.description}
              emptyText="No description"
              editing={editingDescription}
              draft={descriptionDraft}
              onEdit={() => {
                setDescriptionDraft(workOrder.description || '')
                setEditingDescription(true)
              }}
              onDraftChange={setDescriptionDraft}
              onSave={handleDescriptionSave}
              onCancel={() => setEditingDescription(false)}
              rows={5}
            />

            {/* Acceptance Criteria */}
            <EditableSection
              label="Acceptance Criteria"
              icon={<ListChecks className="w-3.5 h-3.5" />}
              content={workOrder.acceptance_criteria}
              emptyText="No acceptance criteria defined"
              editing={editingCriteria}
              draft={criteriaDraft}
              onEdit={() => {
                setCriteriaDraft(workOrder.acceptance_criteria || '')
                setEditingCriteria(true)
              }}
              onDraftChange={setCriteriaDraft}
              onSave={handleCriteriaSave}
              onCancel={() => setEditingCriteria(false)}
              rows={4}
              renderContent={(text) => <CriteriaList text={text} />}
            />

            {/* Implementation Plan */}
            <EditableSection
              label="Implementation Plan"
              icon={<ClipboardList className="w-3.5 h-3.5" />}
              content={workOrder.implementation_plan}
              emptyText="No implementation plan. Agent can generate one in Phase 076."
              editing={editingPlan}
              draft={planDraft}
              onEdit={() => {
                setPlanDraft(workOrder.implementation_plan || '')
                setEditingPlan(true)
              }}
              onDraftChange={setPlanDraft}
              onSave={handlePlanSave}
              onCancel={() => setEditingPlan(false)}
              rows={6}
            />

            {/* Activity Feed */}
            <div className="px-5 py-4 border-t border-border-default">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Activity
                </span>
              </div>
              {activities.length === 0 ? (
                <p className="text-xs text-text-tertiary">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((entry) => (
                    <ActivityItem key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>

            {/* Comments placeholder */}
            <div className="px-5 py-4 border-t border-border-default">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Comments
                </span>
              </div>
              <div className="rounded-lg bg-bg-primary border border-border-default p-3">
                <input
                  type="text"
                  placeholder="Comments coming in Phase 078..."
                  disabled
                  className="w-full bg-transparent text-xs text-text-tertiary placeholder:text-text-tertiary/60 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ── Helper components ──────────────────────────────────────────── */

function MetadataItem({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-text-tertiary">{icon}</span>
        <span className="text-[10px] text-text-tertiary uppercase tracking-wide">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

function InlineDropdown({
  open,
  onToggle,
  onClose,
  trigger,
  children,
}: {
  open: boolean
  onToggle: () => void
  onClose: () => void
  trigger: React.ReactNode
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  return (
    <div className="relative" ref={ref}>
      <div onClick={onToggle}>{trigger}</div>
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-bg-secondary border border-border-default rounded-lg shadow-lg z-10 py-1 max-h-[200px] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  )
}

function EditableSection({
  label,
  icon,
  content,
  emptyText,
  editing,
  draft,
  onEdit,
  onDraftChange,
  onSave,
  onCancel,
  rows,
  renderContent,
}: {
  label: string
  icon: React.ReactNode
  content: string | null
  emptyText: string
  editing: boolean
  draft: string
  onEdit: () => void
  onDraftChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  rows: number
  renderContent?: (text: string) => React.ReactNode
}) {
  return (
    <div className="px-5 py-4 border-t border-border-default">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary">{icon}</span>
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            {label}
          </span>
        </div>
        {!editing && (
          <button
            onClick={onEdit}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={rows}
            className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-y"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel()
            }}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={onSave}
              className="px-3 py-1 bg-accent-cyan text-bg-primary rounded text-xs font-medium hover:bg-accent-cyan/80 transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 text-text-secondary text-xs hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : content ? (
        renderContent ? (
          renderContent(content)
        ) : (
          <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
            {content}
          </p>
        )
      ) : (
        <p className="text-xs text-text-tertiary italic">{emptyText}</p>
      )}
    </div>
  )
}

function CriteriaList({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim())
  return (
    <ul className="space-y-1">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan mt-1.5 flex-shrink-0" />
          <span>{line.replace(/^[-•*]\s*/, '')}</span>
        </li>
      ))}
    </ul>
  )
}

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar
        src={entry.user.avatar_url || undefined}
        alt={entry.user.display_name}
        initials={getInitials(entry.user.display_name)}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-primary">
          <span className="font-medium">{entry.user.display_name}</span>{' '}
          <span className="text-text-secondary">{formatAction(entry)}</span>
        </p>
        <span className="text-[10px] text-text-tertiary">{timeAgo(entry.created_at)}</span>
      </div>
    </div>
  )
}

function formatAction(entry: ActivityEntry): string {
  const details = entry.details as Record<string, string> | null
  switch (entry.action) {
    case 'created':
      return 'created this work order'
    case 'status_changed':
      return `changed status from ${formatStatus(details?.from)} to ${formatStatus(details?.to)}`
    case 'priority_changed':
      return `changed priority from ${details?.from || '?'} to ${details?.to || '?'}`
    case 'assigned':
      return 'assigned this work order'
    case 'unassigned':
      return 'removed the assignee'
    case 'title_changed':
      return 'updated the title'
    case 'description_updated':
      return 'updated the description'
    case 'acceptance_criteria_updated':
      return 'updated acceptance criteria'
    case 'implementation_plan_updated':
      return 'updated the implementation plan'
    case 'phase_changed':
      return 'changed the phase'
    case 'feature_linked':
      return 'updated the linked feature'
    default:
      return entry.action.replace(/_/g, ' ')
  }
}

function formatStatus(status?: string): string {
  const labels: Record<string, string> = {
    backlog: 'Backlog',
    ready: 'Ready',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
  }
  return labels[status || ''] || status || '?'
}
