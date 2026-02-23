'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Download, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast-container'

interface AnalyticsData {
  totalItems: number
  avgScore: number | null
  scoredCount: number
  volumeTimeSeries: { date: string; count: number; movingAvg: number }[]
  categoryDistribution: { name: string; count: number }[]
  statusDistribution: { name: string; count: number }[]
  scoreDistribution: { range: string; count: number }[]
  avgScoreTimeSeries: { date: string; avgScore: number; count: number }[]
  topTags: { name: string; count: number }[]
  dateRange: { from: string; to: string }
}

const RANGE_PRESETS = [
  { label: '7d', value: '7' },
  { label: '30d', value: '30' },
  { label: '90d', value: '90' },
  { label: 'All', value: 'all' },
]

const CATEGORY_COLORS: Record<string, string> = {
  bug: '#ef4444',
  feature_request: '#22c55e',
  ux_issue: '#8b5cf6',
  performance: '#f59e0b',
  other: '#6b7280',
  uncategorized: '#4b5563',
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature_request: 'Feature',
  ux_issue: 'UX Issue',
  performance: 'Performance',
  other: 'Other',
  uncategorized: 'Uncategorized',
}

const STATUS_COLORS: Record<string, string> = {
  new: '#00d4ff',
  triaged: '#f59e0b',
  converted: '#22c55e',
  archived: '#6b7280',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  triaged: 'Triaged',
  converted: 'Converted',
  archived: 'Archived',
}

const SCORE_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981']

const TOOLTIP_STYLE = {
  backgroundColor: '#1a1d27',
  border: '1px solid #2e3140',
  borderRadius: '8px',
  fontSize: '12px',
}

interface AnalyticsDashboardProps {
  projectId: string
}

export function AnalyticsDashboard({ projectId }: AnalyticsDashboardProps) {
  const { addToast } = useToast()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [range, setRange] = useState('30')
  const [isExporting, setIsExporting] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/feedback/analytics?range=${range}`
      )
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setData(json)
    } catch {
      addToast('Failed to load analytics', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, range, addToast])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams({ format, ...(data?.dateRange.from ? { dateFrom: data.dateRange.from } : {}), ...(data?.dateRange.to ? { dateTo: data.dateRange.to } : {}) })
      const res = await fetch(`/api/projects/${projectId}/feedback/analytics/export?${params}`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] || `feedback-export.${format}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      addToast(`Exported as ${format.toUpperCase()}`, 'success')
    } catch {
      addToast('Export failed', 'error')
    } finally {
      setIsExporting(false)
    }
  }, [projectId, data, addToast])

  const formatDate = (date: string) => {
    const d = new Date(date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
        No analytics data available
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Controls: date range + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-tertiary" />
          <div className="flex rounded-lg overflow-hidden border border-border-default">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setRange(preset.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  range === preset.value
                    ? 'bg-accent-cyan text-bg-primary'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary border border-border-default hover:border-accent-cyan/40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary border border-border-default hover:border-accent-cyan/40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Feedback" value={data.totalItems} />
        <SummaryCard
          label="Avg Score"
          value={data.avgScore != null ? `${data.avgScore}` : '—'}
          sub={data.scoredCount > 0 ? `${data.scoredCount} scored` : undefined}
        />
        <SummaryCard
          label="Categories"
          value={data.categoryDistribution.length}
        />
        <SummaryCard
          label="Top Tags"
          value={data.topTags.length}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Over Time */}
        <ChartCard title="Feedback Volume">
          {data.volumeTimeSeries.length > 1 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.volumeTimeSeries} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3140" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 10, fill: '#5a5f73' }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10, fill: '#5a5f73' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#00d4ff"
                  strokeWidth={2}
                  dot={false}
                  name="Daily Count"
                />
                <Line
                  type="monotone"
                  dataKey="movingAvg"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="7-day Avg"
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Category Distribution */}
        <ChartCard title="By Category">
          {data.categoryDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.categoryDistribution.map((d) => ({
                    ...d,
                    displayName: CATEGORY_LABELS[d.name] || d.name,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="count"
                  nameKey="displayName"
                  label={(props) => {
                    const name = String(props.name || '')
                    const pct = typeof props.percent === 'number' ? (props.percent * 100).toFixed(0) : '0'
                    return `${name} ${pct}%`
                  }}
                  labelLine={{ stroke: '#5a5f73' }}
                >
                  {data.categoryDistribution.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CATEGORY_COLORS[entry.name] || '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Score Distribution */}
        <ChartCard title="Score Distribution">
          {data.scoreDistribution.some((b) => b.count > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.scoreDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3140" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#5a5f73' }} />
                <YAxis tick={{ fontSize: 10, fill: '#5a5f73' }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Feedback" radius={[4, 4, 0, 0]}>
                  {data.scoreDistribution.map((_, i) => (
                    <Cell key={i} fill={SCORE_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Status Distribution */}
        <ChartCard title="By Status">
          {data.statusDistribution.length > 0 ? (
            <div className="h-[240px] flex flex-col justify-center gap-3 px-4">
              {data.statusDistribution.map((item) => {
                const pct = data.totalItems > 0
                  ? Math.round((item.count / data.totalItems) * 100)
                  : 0
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary font-medium">
                        {STATUS_LABELS[item.name] || item.name}
                      </span>
                      <span className="text-text-tertiary">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: STATUS_COLORS[item.name] || '#6b7280',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Average Score Trend */}
        {data.avgScoreTimeSeries.length > 1 && (
          <ChartCard title="Average Score Trend">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.avgScoreTimeSeries} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3140" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 10, fill: '#5a5f73' }}
                  interval="preserveStartEnd"
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#5a5f73' }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(l) => `Date: ${l}`}
                  formatter={(value) => [`${value}/100`, 'Avg Score']}
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 3 }}
                  name="Avg Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Top Tags */}
        {data.topTags.length > 0 && (
          <ChartCard title="Top Tags">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.topTags}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3140" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#5a5f73' }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#5a5f73' }}
                  width={55}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#8b5cf6" name="Count" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <p className="text-xs text-text-tertiary font-medium">{label}</p>
      <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
      {sub && <p className="text-[10px] text-text-tertiary mt-0.5">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">{title}</h3>
      {children}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-[240px] flex items-center justify-center text-text-tertiary text-sm">
      No data for this period
    </div>
  )
}
