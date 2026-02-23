'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Users,
  Activity,
  Layers,
  Clock,
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

interface DashboardData {
  project_progress: {
    total: number
    completed: number
    percentage: number
  }
  status_counts: Record<string, number>
  phases: PhaseProgress[]
  features: FeatureProgress[]
  recent_activity: ActivityEntry[]
  team_workload: TeamMember[]
  blockers: Blocker[]
}

interface PhaseProgress {
  id: string
  name: string
  status: string
  total: number
  completed: number
  percentage: number
}

interface FeatureProgress {
  id: string
  title: string
  parent_id: string | null
  level: string
  total: number
  completed: number
  percentage: number
}

interface ActivityEntry {
  id: string
  action: string
  details: Record<string, string> | null
  created_at: string
  user_name: string
  work_order_title: string
}

interface TeamMember {
  user_id: string
  name: string
  assigned: number
  completed: number
  in_progress: number
}

interface Blocker {
  id: string
  title: string
  status: string
  priority: string
}

interface DashboardClientProps {
  projectId: string
}

export function DashboardClient({ projectId }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/projects/${projectId}/dashboard`)
      if (!res.ok) throw new Error('Failed to load dashboard')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-accent-error mb-2">{error || 'No data'}</p>
        <button onClick={fetchDashboard} className="text-xs text-accent-cyan hover:underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Progress Ring + Status Distribution + Blockers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ProgressRing progress={data.project_progress} />
        <StatusDistribution counts={data.status_counts} total={data.project_progress.total} />
        <BlockersWidget blockers={data.blockers} />
      </div>

      {/* Row 2: Phase Cards */}
      {data.phases.length > 0 && (
        <div>
          <SectionHeader icon={<Layers className="w-4 h-4" />} title="Phase Progress" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {data.phases.map((phase) => (
              <PhaseCard key={phase.id} phase={phase} />
            ))}
          </div>
        </div>
      )}

      {/* Row 3: Feature Tree + Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.features.length > 0 && (
          <div>
            <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title="Feature Progress" />
            <FeatureTree features={data.features} />
          </div>
        )}
        <div>
          {data.team_workload.length > 0 && (
            <>
              <SectionHeader icon={<Users className="w-4 h-4" />} title="Team Workload" />
              <TeamWorkload members={data.team_workload} />
            </>
          )}
          {data.recent_activity.length > 0 && (
            <div className={data.team_workload.length > 0 ? 'mt-4' : ''}>
              <SectionHeader icon={<Activity className="w-4 h-4" />} title="Recent Activity" />
              <ActivityFeed entries={data.recent_activity} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Section Header ──────────────────────────────── */

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-text-tertiary">{icon}</span>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
    </div>
  )
}

/* ── Progress Ring ──────────────────────────────── */

function ProgressRing({ progress }: { progress: DashboardData['project_progress'] }) {
  const size = 160
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress.percentage / 100) * circumference

  const ringColor = progress.percentage === 100
    ? 'stroke-accent-success'
    : progress.percentage >= 50
      ? 'stroke-accent-cyan'
      : progress.percentage > 0
        ? 'stroke-accent-warning'
        : 'stroke-text-tertiary'

  return (
    <div className="glass-panel rounded-lg p-6 flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-bg-tertiary"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn('transition-all duration-700 ease-out', ringColor)}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-text-primary">{progress.percentage}%</span>
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Complete</span>
        </div>
      </div>
      <p className="text-xs text-text-secondary mt-3">
        {progress.completed} of {progress.total} work orders done
      </p>
    </div>
  )
}

/* ── Status Distribution ──────────────────────────── */

const STATUS_CONFIG: { key: string; label: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', color: 'bg-text-tertiary' },
  { key: 'ready', label: 'Ready', color: 'bg-text-secondary' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-accent-cyan' },
  { key: 'in_review', label: 'In Review', color: 'bg-accent-purple' },
  { key: 'done', label: 'Done', color: 'bg-accent-success' },
]

function StatusDistribution({ counts, total }: { counts: Record<string, number>; total: number }) {
  return (
    <div className="glass-panel rounded-lg p-6">
      <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-4">Status Breakdown</h4>
      {/* Stacked bar */}
      {total > 0 && (
        <div className="flex rounded-full h-3 overflow-hidden mb-4">
          {STATUS_CONFIG.map((s) => {
            const count = counts[s.key] || 0
            const pct = (count / total) * 100
            if (pct === 0) return null
            return (
              <div
                key={s.key}
                className={cn('transition-all duration-500', s.color)}
                style={{ width: `${pct}%` }}
                title={`${s.label}: ${count}`}
              />
            )
          })}
        </div>
      )}
      <div className="space-y-2">
        {STATUS_CONFIG.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn('w-2.5 h-2.5 rounded-full', s.color)} />
              <span className="text-xs text-text-secondary">{s.label}</span>
            </div>
            <span className="text-xs font-medium text-text-primary">{counts[s.key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Blockers Widget ──────────────────────────────── */

function BlockersWidget({ blockers }: { blockers: Blocker[] }) {
  const priorityColor: Record<string, string> = {
    critical: 'text-accent-error',
    high: 'text-accent-warning',
  }

  return (
    <div className="glass-panel rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-accent-warning" />
        <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          Blockers & Risks
        </h4>
        {blockers.length > 0 && (
          <span className="text-[10px] font-medium bg-accent-warning/10 text-accent-warning px-1.5 py-0.5 rounded-full">
            {blockers.length}
          </span>
        )}
      </div>
      {blockers.length === 0 ? (
        <p className="text-xs text-text-tertiary">No high-priority items at risk.</p>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {blockers.map((b) => (
            <div key={b.id} className="flex items-start gap-2 py-1">
              <span className={cn('text-[10px] font-semibold uppercase mt-0.5', priorityColor[b.priority] || 'text-text-tertiary')}>
                {b.priority === 'critical' ? 'CRIT' : 'HIGH'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary truncate">{b.title}</p>
                <span className="text-[10px] text-text-tertiary capitalize">{b.status.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Phase Card ──────────────────────────────── */

function PhaseCard({ phase }: { phase: PhaseProgress }) {
  const statusColor: Record<string, string> = {
    planned: 'bg-text-tertiary/10 text-text-tertiary',
    active: 'bg-accent-cyan/10 text-accent-cyan',
    completed: 'bg-accent-success/10 text-accent-success',
  }

  const barColor = phase.percentage === 100
    ? 'bg-accent-success'
    : phase.percentage > 0
      ? 'bg-accent-cyan'
      : 'bg-bg-tertiary'

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-text-primary truncate">{phase.name}</h4>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', statusColor[phase.status] || statusColor.planned)}>
          {phase.status}
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mb-1.5">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${phase.percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-tertiary">{phase.completed}/{phase.total} complete</span>
        <span className="text-[10px] font-medium text-text-secondary">{phase.percentage}%</span>
      </div>
    </div>
  )
}

/* ── Feature Tree ──────────────────────────────── */

interface TreeNode extends FeatureProgress {
  children: TreeNode[]
}

function buildTree(features: FeatureProgress[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  // Create nodes
  for (const f of features) {
    nodeMap.set(f.id, { ...f, children: [] })
  }

  // Link parent-child
  for (const f of features) {
    const node = nodeMap.get(f.id)!
    if (f.parent_id && nodeMap.has(f.parent_id)) {
      nodeMap.get(f.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Aggregate children progress into parents
  function aggregate(node: TreeNode): { total: number; completed: number } {
    let total = node.total
    let completed = node.completed
    for (const child of node.children) {
      const childStats = aggregate(child)
      total += childStats.total
      completed += childStats.completed
    }
    if (node.children.length > 0 && total > 0) {
      node.total = total
      node.completed = completed
      node.percentage = Math.round((completed / total) * 100)
    }
    return { total, completed }
  }

  for (const root of roots) {
    aggregate(root)
  }

  return roots
}

function FeatureTree({ features }: { features: FeatureProgress[] }) {
  const tree = buildTree(features)
  // Only show nodes that have work orders (directly or through children)
  const relevantTree = tree.filter((n) => n.total > 0 || n.children.some((c) => c.total > 0))

  if (relevantTree.length === 0) {
    return (
      <div className="glass-panel rounded-lg p-4">
        <p className="text-xs text-text-tertiary">No features with work orders yet.</p>
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-lg p-4 max-h-[360px] overflow-y-auto space-y-1">
      {relevantTree.map((node) => (
        <FeatureTreeNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  )
}

function FeatureTreeNode({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth === 0)
  const hasChildren = node.children.length > 0
  const relevantChildren = node.children.filter((c) => c.total > 0)

  const barColor = node.percentage === 100
    ? 'bg-accent-success'
    : node.percentage > 0
      ? 'bg-accent-cyan'
      : 'bg-bg-tertiary'

  return (
    <div style={{ paddingLeft: `${depth * 16}px` }}>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 rounded px-2',
          hasChildren && 'cursor-pointer hover:bg-bg-tertiary/50'
        )}
        onClick={hasChildren ? () => setExpanded(!expanded) : undefined}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="w-3 h-3 text-text-tertiary flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-text-tertiary flex-shrink-0" />
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}
        <span className="text-xs text-text-primary truncate flex-1">{node.title}</span>
        {node.total > 0 && (
          <>
            <div className="w-16 h-1 rounded-full bg-bg-tertiary overflow-hidden flex-shrink-0">
              <div className={cn('h-full rounded-full', barColor)} style={{ width: `${node.percentage}%` }} />
            </div>
            <span className="text-[10px] text-text-tertiary w-8 text-right flex-shrink-0">{node.percentage}%</span>
          </>
        )}
      </div>
      {expanded && relevantChildren.map((child) => (
        <FeatureTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

/* ── Team Workload ──────────────────────────────── */

function TeamWorkload({ members }: { members: TeamMember[] }) {
  const maxAssigned = Math.max(...members.map((m) => m.assigned), 1)

  return (
    <div className="glass-panel rounded-lg p-4 space-y-3">
      {members.map((m) => (
        <div key={m.user_id}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-text-primary truncate">{m.name}</span>
            <span className="text-[10px] text-text-tertiary">
              {m.completed} done · {m.in_progress} active · {m.assigned} total
            </span>
          </div>
          <div className="flex rounded-full h-2 overflow-hidden bg-bg-tertiary">
            <div
              className="bg-accent-success transition-all duration-500"
              style={{ width: `${(m.completed / maxAssigned) * 100}%` }}
              title={`${m.completed} done`}
            />
            <div
              className="bg-accent-cyan transition-all duration-500"
              style={{ width: `${(m.in_progress / maxAssigned) * 100}%` }}
              title={`${m.in_progress} in progress`}
            />
            <div
              className="bg-text-tertiary/40 transition-all duration-500"
              style={{ width: `${((m.assigned - m.completed - m.in_progress) / maxAssigned) * 100}%` }}
              title={`${m.assigned - m.completed - m.in_progress} remaining`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Activity Feed ──────────────────────────────── */

function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <div className="glass-panel rounded-lg p-4 max-h-[280px] overflow-y-auto space-y-2.5">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2">
          <Clock className="w-3 h-3 text-text-tertiary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-primary">
              <span className="font-medium">{entry.user_name}</span>{' '}
              <span className="text-text-secondary">{formatDashboardAction(entry)}</span>{' '}
              <span className="font-medium text-accent-cyan">{entry.work_order_title}</span>
            </p>
            <span className="text-[10px] text-text-tertiary">{timeAgo(entry.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatDashboardAction(entry: ActivityEntry): string {
  const details = entry.details as Record<string, string> | null
  switch (entry.action) {
    case 'created': return 'created'
    case 'status_changed': return `moved to ${details?.to?.replace('_', ' ') || '?'} —`
    case 'priority_changed': return `set priority to ${details?.to || '?'} on`
    case 'assigned': return 'was assigned to'
    case 'unassigned': return 'removed assignee from'
    case 'phase_changed': return 'changed phase of'
    default: return `${entry.action.replace(/_/g, ' ')} on`
  }
}
