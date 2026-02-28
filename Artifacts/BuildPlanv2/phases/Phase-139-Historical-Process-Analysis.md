# Phase 139 — Historical Process Analysis

## Objective
Build trend analysis capabilities showing how Helix process metrics evolve over time across projects, identifying patterns in project duration, bottleneck stages, test coverage, and deployment frequency.

## Prerequisites
- Phase 136 — Process Metrics Dashboard — Foundation for metrics calculation
- Phase 137 — Multi-Project Process Comparison — Cross-project metric infrastructure

## Epic Context
**Epic:** 17 — Process Analytics & Reporting
**Phase:** 139 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Organizations improve through iteration. By tracking metrics over weeks and months, teams can see if their process optimizations are working. Trends reveal whether projects are getting faster, whether test coverage is improving, whether deployments are happening more frequently. Insights like "Projects are 15% faster than 3 months ago" or "Bottleneck stages have shifted" inform strategic process improvements.

Historical analysis provides the longitudinal view necessary for data-driven process optimization. Dashboards answer "Are we improving?"

---

## Detailed Requirements

### 1. Historical Metrics Aggregation
#### File: `lib/metrics/historicalAnalysis.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface DailyMetrics {
  date: Date;
  averageProjectDuration: number; // minutes
  projectCount: number;
  averageTestCoverage: number;
  deploymentCount: number;
  bottleneckStageCount: number;
}

export interface TrendAnalysis {
  metric: string;
  current: number;
  previous: number;
  change: number; // percentage
  direction: 'up' | 'down' | 'stable';
  trend: 'improving' | 'declining' | 'stable';
}

export interface StageBottleneckTrend {
  stageName: string;
  averageDuration: number;
  trend: TrendAnalysis;
  occurrences: number; // How many projects had this as bottleneck
}

export async function getDailyMetricsHistory(
  orgId: string,
  days: number = 90,
  supabaseClient: ReturnType<typeof createClient>
): Promise<DailyMetrics[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: phases } = await supabaseClient
    .from('helix_build_phases')
    .select(`
      duration_minutes,
      completed_at,
      project_id,
      projects(org_id)
    `)
    .eq('status', 'completed')
    .gte('completed_at', startDate.toISOString());

  const { data: deployments } = await supabaseClient
    .from('helix_deployments')
    .select(`
      created_at,
      project_id,
      projects(org_id)
    `)
    .gte('created_at', startDate.toISOString());

  const { data: testResults } = await supabaseClient
    .from('helix_test_results')
    .select(`
      passed,
      total,
      created_at,
      project_id,
      projects(org_id)
    `)
    .gte('created_at', startDate.toISOString());

  // Group by date
  const dailyGroups = new Map<string, any[]>();

  phases?.forEach((phase: any) => {
    if (phase.projects?.org_id === orgId) {
      const date = new Date(phase.completed_at).toISOString().split('T')[0];
      if (!dailyGroups.has(date)) dailyGroups.set(date, []);
      dailyGroups.get(date)!.push({
        type: 'phase',
        duration: phase.duration_minutes,
        projectId: phase.project_id,
      });
    }
  });

  deployments?.forEach((deployment: any) => {
    if (deployment.projects?.org_id === orgId) {
      const date = new Date(deployment.created_at).toISOString().split('T')[0];
      if (!dailyGroups.has(date)) dailyGroups.set(date, []);
      dailyGroups.get(date)!.push({ type: 'deployment' });
    }
  });

  testResults?.forEach((test: any) => {
    if (test.projects?.org_id === orgId) {
      const date = new Date(test.created_at).toISOString().split('T')[0];
      if (!dailyGroups.has(date)) dailyGroups.set(date, []);
      dailyGroups.get(date)!.push({
        type: 'test',
        coverage: test.passed / test.total,
      });
    }
  });

  const metrics: DailyMetrics[] = [];

  dailyGroups.forEach((events, date) => {
    const phases = events.filter(e => e.type === 'phase');
    const deployments = events.filter(e => e.type === 'deployment');
    const tests = events.filter(e => e.type === 'test');
    const projects = new Set(phases.map(p => p.projectId));

    metrics.push({
      date: new Date(date),
      averageProjectDuration: phases.length > 0
        ? phases.reduce((sum, p) => sum + p.duration, 0) / phases.length
        : 0,
      projectCount: projects.size,
      averageTestCoverage: tests.length > 0
        ? tests.reduce((sum, t) => sum + t.coverage, 0) / tests.length
        : 0,
      deploymentCount: deployments.length,
      bottleneckStageCount: 0, // Calculated separately
    });
  });

  return metrics.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function getTrendAnalysis(
  orgId: string,
  days: number = 90,
  supabaseClient: ReturnType<typeof createClient>
): Promise<TrendAnalysis[]> {
  const dailyMetrics = await getDailyMetricsHistory(orgId, days, supabaseClient);

  if (dailyMetrics.length < 2) {
    return [];
  }

  const midpoint = Math.floor(dailyMetrics.length / 2);
  const first = dailyMetrics.slice(0, midpoint);
  const second = dailyMetrics.slice(midpoint);

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const getMetricValue = (metric: string, data: DailyMetrics[]) => {
    switch (metric) {
      case 'projectDuration':
        return avg(data.map(m => m.averageProjectDuration));
      case 'testCoverage':
        return avg(data.map(m => m.averageTestCoverage));
      case 'deploymentFrequency':
        return avg(data.map(m => m.deploymentCount));
      default:
        return 0;
    }
  };

  const metrics = ['projectDuration', 'testCoverage', 'deploymentFrequency'];
  const trends: TrendAnalysis[] = [];

  metrics.forEach(metric => {
    const prevValue = getMetricValue(metric, first);
    const currValue = getMetricValue(metric, second);
    const change = prevValue > 0 ? ((currValue - prevValue) / prevValue) * 100 : 0;

    let direction: 'up' | 'down' | 'stable' = 'stable';
    let trend: 'improving' | 'declining' | 'stable' = 'stable';

    if (Math.abs(change) > 5) {
      direction = change > 0 ? 'up' : 'down';

      // Interpret direction based on metric
      if (metric === 'projectDuration') {
        trend = change > 0 ? 'declining' : 'improving';
      } else {
        trend = change > 0 ? 'improving' : 'declining';
      }
    }

    trends.push({
      metric,
      current: currValue,
      previous: prevValue,
      change,
      direction,
      trend,
    });
  });

  return trends;
}

export async function getBottleneckStagesTrend(
  orgId: string,
  days: number = 90,
  supabaseClient: ReturnType<typeof createClient>
): Promise<StageBottleneckTrend[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: stageHistory } = await supabaseClient
    .from('helix_process_stage_history')
    .select(`
      stage_name,
      started_at,
      completed_at,
      project_id,
      projects(org_id)
    `)
    .gte('completed_at', startDate.toISOString())
    .not('completed_at', 'is', null);

  // Group by stage and calculate trends
  const stageGroups = new Map<string, number[]>();

  stageHistory?.forEach((record: any) => {
    if (record.projects?.org_id === orgId) {
      const duration = (new Date(record.completed_at).getTime() -
                       new Date(record.started_at).getTime()) / (1000 * 60);
      if (!stageGroups.has(record.stage_name)) {
        stageGroups.set(record.stage_name, []);
      }
      stageGroups.get(record.stage_name)!.push(duration);
    }
  });

  const trends: StageBottleneckTrend[] = [];

  stageGroups.forEach((durations, stage) => {
    const sorted = durations.sort((a, b) => a - b);
    const mid = Math.floor(durations.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const change = ((avg2 - avg1) / avg1) * 100;

    trends.push({
      stageName: stage,
      averageDuration: sorted[Math.floor(sorted.length / 2)],
      trend: {
        metric: stage,
        current: avg2,
        previous: avg1,
        change,
        direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
        trend: change > 5 ? 'declining' : change < -5 ? 'improving' : 'stable',
      },
      occurrences: durations.length,
    });
  });

  return trends.sort((a, b) => b.averageDuration - a.averageDuration);
}
```

### 2. Historical Trends Dashboard Component
#### File: `components/helix/analytics/HistoricalAnalysis.tsx` (NEW)
```typescript
'use client';

import React from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import {
  getDailyMetricsHistory,
  getTrendAnalysis,
  getBottleneckStagesTrend,
} from '@/lib/metrics/historicalAnalysis';
import { createClient } from '@/lib/supabase/client';

interface HistoricalAnalysisProps {
  orgId: string;
  days?: number;
}

export function HistoricalAnalysis({
  orgId,
  days = 90,
}: HistoricalAnalysisProps) {
  const supabase = createClient();

  const { data: dailyMetrics } = useQuery({
    queryKey: ['daily-metrics', orgId, days],
    queryFn: () => getDailyMetricsHistory(orgId, days, supabase),
  });

  const { data: trends } = useQuery({
    queryKey: ['trend-analysis', orgId, days],
    queryFn: () => getTrendAnalysis(orgId, days, supabase),
  });

  const { data: bottleneckTrends } = useQuery({
    queryKey: ['bottleneck-trends', orgId, days],
    queryFn: () => getBottleneckStagesTrend(orgId, days, supabase),
  });

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '↓';
    if (trend === 'declining') return '↑';
    return '→';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'improving') return 'text-green-600';
    if (trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Historical Process Analysis</h1>
        <span className="text-sm text-gray-600">Last {days} days</span>
      </div>

      {/* Trend Summary Cards */}
      {trends && trends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trends.map((trend) => (
            <div key={trend.metric} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-700 capitalize">
                {trend.metric.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {typeof trend.current === 'number'
                      ? trend.current.toFixed(1)
                      : trend.current}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Current</p>
                </div>
                <div className={`text-3xl font-bold ${getTrendColor(trend.trend)}`}>
                  {getTrendIcon(trend.trend)}
                </div>
              </div>
              <p className={`text-sm mt-2 ${getTrendColor(trend.trend)}`}>
                {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}% from previous period
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Project Duration Trend */}
      {dailyMetrics && dailyMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Average Project Duration Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyMetrics}>
              <defs>
                <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />
              <YAxis label={{ value: 'Duration (min)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value) => value.toFixed(0)}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Area
                type="monotone"
                dataKey="averageProjectDuration"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorDuration)"
                name="Avg Duration"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Test Coverage Trend */}
      {dailyMetrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Coverage Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />
              <YAxis label={{ value: 'Coverage (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value) => `${(value * 100).toFixed(1)}%`}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="averageTestCoverage"
                stroke="#10b981"
                name="Test Coverage"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Deployment Frequency */}
      {dailyMetrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Deployment Frequency Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />
              <YAxis label={{ value: 'Deployments/Day', angle: -90, position: 'insideLeft' }} />
              <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
              <Legend />
              <Line
                type="stepAfter"
                dataKey="deploymentCount"
                stroke="#f59e0b"
                name="Daily Deployments"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stage Bottleneck Evolution */}
      {bottleneckTrends && bottleneckTrends.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Stage Bottleneck Evolution</h2>
          <div className="space-y-3">
            {bottleneckTrends.slice(0, 5).map((stage) => (
              <div key={stage.stageName} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{stage.stageName}</p>
                  <p className="text-sm text-gray-600">
                    {stage.occurrences} occurrences
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{Math.round(stage.averageDuration)} min</p>
                  <p className={`text-sm ${getTrendColor(stage.trend.trend)}`}>
                    {getTrendIcon(stage.trend.trend)} {stage.trend.change.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights */}
      <div className="bg-blue-50 rounded-lg shadow p-6 border-l-4 border-blue-600">
        <h3 className="font-semibold text-lg mb-2">Key Insights</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          {trends?.find(t => t.metric === 'projectDuration')?.trend === 'improving' && (
            <li>
              Projects are getting faster. Average duration decreased by{' '}
              {Math.abs(trends.find(t => t.metric === 'projectDuration')?.change || 0).toFixed(1)}%.
            </li>
          )}
          {trends?.find(t => t.metric === 'testCoverage')?.trend === 'improving' && (
            <li>
              Test coverage is improving. Up{' '}
              {trends.find(t => t.metric === 'testCoverage')?.change.toFixed(1)}% from previous
              period.
            </li>
          )}
          {bottleneckTrends && bottleneckTrends[0]?.trend.trend === 'declining' && (
            <li>
              {bottleneckTrends[0].stageName} is becoming a bigger bottleneck. Monitor and optimize.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
```

### 3. Historical Analysis API
#### File: `app/api/v1/orgs/[id]/metrics/history/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getDailyMetricsHistory,
  getTrendAnalysis,
  getBottleneckStagesTrend,
} from '@/lib/metrics/historicalAnalysis';
import { verifyApiKey } from '@/lib/auth/apiKeys';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const verified = await verifyApiKey(apiKey);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const days = parseInt(request.nextUrl.searchParams.get('days') || '90');
    const supabase = createClient();

    const [dailyMetrics, trends, bottlenecks] = await Promise.all([
      getDailyMetricsHistory(params.id, days, supabase),
      getTrendAnalysis(params.id, days, supabase),
      getBottleneckStagesTrend(params.id, days, supabase),
    ]);

    return NextResponse.json({
      orgId: params.id,
      days,
      dailyMetrics,
      trends,
      bottleneckTrends: bottlenecks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
lib/
├── metrics/
│   └── historicalAnalysis.ts (NEW)
components/
├── helix/
│   └── analytics/
│       └── HistoricalAnalysis.tsx (NEW)
app/
└── api/
    └── v1/
        └── orgs/
            └── [id]/
                └── metrics/
                    └── history/
                        └── route.ts (NEW)
```

---

## Dependencies
- recharts: ^2.10.0
- @tanstack/react-query: ^5.28.0
- Supabase client: existing

---

## Tech Stack for This Phase
- Next.js 16+ (API routes, Server Components)
- TypeScript
- Supabase (historical data queries)
- Recharts (area and line charts)
- TailwindCSS v4 (styling)

---

## Acceptance Criteria
1. Daily metrics aggregated for specified date range (default 90 days)
2. Trend analysis compares first half vs second half of period
3. Project duration trend displayed as area chart with smooth curve
4. Test coverage trend displayed as line chart
5. Deployment frequency trend displayed as step chart
6. Stage bottleneck trends identify which stages are improving/declining
7. Trend indicators show percentage change and direction arrows
8. Key insights summarized at bottom of dashboard
9. API accessible at /api/v1/orgs/:id/metrics/history?days=90
10. All charts render correctly with 30+ days of historical data

---

## Testing Instructions
1. Create org and multiple projects with 30+ completed phases over time
2. Verify daily metrics aggregated correctly by date
3. Verify trend analysis calculates percentage change correctly
4. Verify area chart displays smooth interpolation of duration trend
5. Verify line charts render test coverage and deployments
6. Verify bottleneck trends rank stages by average duration
7. Verify trend direction icons and colors accurate (improving=green, declining=red)
8. Call /api/v1/orgs/:id/metrics/history with ?days=30, verify correct data
9. Verify insights generated based on trend directions
10. Verify charts responsive at 320px, 768px, 1280px widths

---

## Notes for the AI Agent
- Consider adding anomaly detection for unusual spikes/dips
- Future enhancement: forecasting (predict next 30 days based on trend)
- Consider weekly vs daily aggregation options
- Exportable reports of historical trends for leadership reviews
