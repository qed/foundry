'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  X,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  BarChart3,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { Phase } from '@/types/database'

interface BurndownData {
  phase: Phase
  total: number
  completed: number
  remaining: number
  velocity: number
  estimatedCompletion: string | null
  dataPoints: { date: string; remaining: number; ideal: number }[]
  statusBreakdown: Record<string, number>
}

interface PhaseBurndownProps {
  projectId: string
  phaseId: string
  phaseName: string
  onClose: () => void
}

export function PhaseBurndown({ projectId, phaseId, phaseName, onClose }: PhaseBurndownProps) {
  const [data, setData] = useState<BurndownData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const doFetch = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/projects/${projectId}/phases/${phaseId}/burndown`)
        if (!res.ok) throw new Error('Failed to load burndown data')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setIsLoading(false)
      }
    }
    doFetch()
  }, [projectId, phaseId])

  const progressPct = data && data.total > 0
    ? Math.round((data.completed / data.total) * 100)
    : 0

  const velocityTrend = data ? (data.velocity > 0 ? 'up' : data.velocity === 0 ? 'flat' : 'flat') : 'flat'

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-secondary">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 text-accent-cyan flex-shrink-0" />
          <h3 className="text-sm font-semibold text-text-primary truncate">
            Burndown: {phaseName}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-sm text-accent-error">{error}</p>
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {/* Metrics summary */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={<Target className="w-4 h-4 text-accent-cyan" />}
                label="Total"
                value={data.total.toString()}
              />
              <MetricCard
                icon={<CheckCircle2 className="w-4 h-4 text-accent-success" />}
                label="Completed"
                value={`${data.completed} (${progressPct}%)`}
              />
              <MetricCard
                icon={<Clock className="w-4 h-4 text-accent-warning" />}
                label="Remaining"
                value={data.remaining.toString()}
              />
              <MetricCard
                icon={
                  velocityTrend === 'up'
                    ? <TrendingUp className="w-4 h-4 text-accent-success" />
                    : velocityTrend === 'flat'
                    ? <Minus className="w-4 h-4 text-text-tertiary" />
                    : <TrendingDown className="w-4 h-4 text-accent-error" />
                }
                label="Velocity (7d avg)"
                value={`${data.velocity} WO/day`}
              />
            </div>

            {/* Estimated completion */}
            {data.estimatedCompletion && data.remaining > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20">
                <Calendar className="w-4 h-4 text-accent-cyan flex-shrink-0" />
                <p className="text-sm text-accent-cyan">
                  Est. completion: {new Date(data.estimatedCompletion).toLocaleDateString()}
                  {' '}({Math.ceil(data.remaining / Math.max(data.velocity, 0.01))} days)
                </p>
              </div>
            )}

            {data.completed === data.total && data.total > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-success/10 border border-accent-success/20">
                <CheckCircle2 className="w-4 h-4 text-accent-success flex-shrink-0" />
                <p className="text-sm text-accent-success">Phase complete!</p>
              </div>
            )}

            {/* Status breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Status Breakdown
              </h4>
              <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-bg-tertiary">
                {data.total > 0 && (
                  <>
                    {data.statusBreakdown.done > 0 && (
                      <div
                        className="bg-accent-success rounded-full"
                        style={{ width: `${(data.statusBreakdown.done / data.total) * 100}%` }}
                        title={`Done: ${data.statusBreakdown.done}`}
                      />
                    )}
                    {data.statusBreakdown.in_review > 0 && (
                      <div
                        className="bg-accent-purple rounded-full"
                        style={{ width: `${(data.statusBreakdown.in_review / data.total) * 100}%` }}
                        title={`In Review: ${data.statusBreakdown.in_review}`}
                      />
                    )}
                    {data.statusBreakdown.in_progress > 0 && (
                      <div
                        className="bg-accent-cyan rounded-full"
                        style={{ width: `${(data.statusBreakdown.in_progress / data.total) * 100}%` }}
                        title={`In Progress: ${data.statusBreakdown.in_progress}`}
                      />
                    )}
                    {data.statusBreakdown.ready > 0 && (
                      <div
                        className="bg-accent-warning rounded-full"
                        style={{ width: `${(data.statusBreakdown.ready / data.total) * 100}%` }}
                        title={`Ready: ${data.statusBreakdown.ready}`}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <StatusLabel color="bg-accent-success" label="Done" count={data.statusBreakdown.done} />
                <StatusLabel color="bg-accent-purple" label="Review" count={data.statusBreakdown.in_review} />
                <StatusLabel color="bg-accent-cyan" label="In Progress" count={data.statusBreakdown.in_progress} />
                <StatusLabel color="bg-accent-warning" label="Ready" count={data.statusBreakdown.ready} />
                <StatusLabel color="bg-bg-tertiary" label="Backlog" count={data.statusBreakdown.backlog} />
              </div>
            </div>

            {/* Burndown chart */}
            {data.dataPoints.length > 1 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Burndown Chart
                </h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dataPoints} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e3140" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#5a5f73' }}
                        tickFormatter={(v: string) => {
                          const d = new Date(v)
                          return `${d.getMonth() + 1}/${d.getDate()}`
                        }}
                        stroke="#2e3140"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#5a5f73' }}
                        stroke="#2e3140"
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1d27',
                          border: '1px solid #2e3140',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: '#8b8fa3' }}
                        labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '11px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="remaining"
                        name="Remaining"
                        stroke="#00d4ff"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="ideal"
                        name="Ideal"
                        stroke="#5a5f73"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : data.total > 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                <p className="text-sm text-text-secondary">Collecting data...</p>
                <p className="text-xs text-text-tertiary mt-1">
                  The burndown chart appears after the first day of activity.
                </p>
              </div>
            ) : null}
          </>
        )}

        {!isLoading && !error && data && data.total === 0 && (
          <div className="text-center py-16">
            <BarChart3 className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">No work orders in this phase</p>
            <p className="text-xs text-text-tertiary mt-1">
              Assign work orders to this phase to see burndown data.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-panel rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  )
}

function StatusLabel({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-text-tertiary">{label}: {count}</span>
    </div>
  )
}
