# Phase 136 — Process Metrics Dashboard

## Objective
Build a comprehensive metrics dashboard that visualizes key Helix process performance indicators including stage duration analysis, bottleneck detection, and overall process health scoring using Recharts for interactive visualization.

## Prerequisites
- Phase 135 — Core Helix Process Engine — Foundation for all process metrics collection

## Epic Context
**Epic:** 17 — Process Analytics & Reporting
**Phase:** 136 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The Helix process engine now tracks all phases and stages, but lacks visibility into performance metrics. Teams need to understand where time is spent, which stages create bottlenecks, and overall process health. This dashboard provides at-a-glance metrics with drill-down capabilities to identify optimization opportunities.

Process metrics drive continuous improvement. By visualizing average phase build time, stage duration distributions, and health scores, teams can identify slow stages, track improvements, and optimize their workflow. The health gauge provides a composite signal of process status.

---

## Detailed Requirements

### 1. Metrics Data Model
#### File: `lib/metrics/processMetrics.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

// Types for process metrics
export interface StageMetrics {
  stage: string;
  averageDuration: number; // minutes
  minDuration: number;
  maxDuration: number;
  completedCount: number;
  lastCompleted?: Date;
}

export interface PhaseMetrics {
  phaseNumber: number;
  averageDuration: number; // minutes
  totalDuration: number;
  completedCount: number;
  successRate: number; // 0-1
}

export interface ProcessHealthScore {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor';
  factors: {
    avgPhaseTime: number;
    bottleneckCount: number;
    testCoverage: number;
    deploymentFrequency: number;
  };
}

// Calculate stage metrics for a project
export async function getProjectStageMetrics(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<StageMetrics[]> {
  const { data, error } = await supabaseClient
    .from('helix_process_stage_history')
    .select(`
      stage_name,
      started_at,
      completed_at
    `)
    .eq('project_id', projectId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  // Group by stage and calculate metrics
  const stageGroups = new Map<string, number[]>();

  data.forEach((record: any) => {
    const duration = new Date(record.completed_at).getTime() -
                     new Date(record.started_at).getTime();
    const minutes = duration / (1000 * 60);

    if (!stageGroups.has(record.stage_name)) {
      stageGroups.set(record.stage_name, []);
    }
    stageGroups.get(record.stage_name)!.push(minutes);
  });

  const metrics: StageMetrics[] = [];

  stageGroups.forEach((durations, stage) => {
    const sorted = durations.sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    metrics.push({
      stage,
      averageDuration: sum / durations.length,
      minDuration: sorted[0],
      maxDuration: sorted[sorted.length - 1],
      completedCount: durations.length,
      lastCompleted: new Date(),
    });
  });

  return metrics.sort((a, b) => b.averageDuration - a.averageDuration);
}

// Calculate process health score
export async function calculateProcessHealth(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<ProcessHealthScore> {
  const stageMetrics = await getProjectStageMetrics(projectId, supabaseClient);

  const { data: testData } = await supabaseClient
    .from('helix_test_results')
    .select('passed, total')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1);

  const { data: deployData } = await supabaseClient
    .from('helix_deployments')
    .select('id')
    .eq('project_id', projectId);

  const avgPhaseTime = stageMetrics.reduce((sum, m) => sum + m.averageDuration, 0) /
                       (stageMetrics.length || 1);
  const bottlenecks = stageMetrics.filter(m => m.averageDuration > avgPhaseTime * 1.5).length;
  const testCoverage = testData?.[0]?.passed / testData?.[0]?.total || 0.5;
  const deploymentFreq = deployData?.length || 0;

  // Score components (0-25 each)
  const phaseTimeScore = Math.min(25, 25 * (60 / Math.max(avgPhaseTime, 1))); // 1hr = max
  const bottleneckScore = Math.max(0, 25 - bottlenecks * 5);
  const testScore = testCoverage * 25;
  const deployScore = Math.min(25, deploymentFreq * 5);

  const totalScore = Math.round(phaseTimeScore + bottleneckScore + testScore + deployScore);

  return {
    score: totalScore,
    status: totalScore >= 80 ? 'excellent' :
            totalScore >= 60 ? 'good' :
            totalScore >= 40 ? 'fair' : 'poor',
    factors: {
      avgPhaseTime,
      bottleneckCount: bottlenecks,
      testCoverage,
      deploymentFrequency: deploymentFreq,
    },
  };
}
```

### 2. Dashboard Component
#### File: `components/helix/analytics/ProcessMetricsDashboard.tsx` (NEW)
```typescript
'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, GaugeChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getProjectStageMetrics, calculateProcessHealth } from '@/lib/metrics/processMetrics';
import { createClient } from '@/lib/supabase/client';

interface ProcessMetricsDashboardProps {
  projectId: string;
}

export function ProcessMetricsDashboard({ projectId }: ProcessMetricsDashboardProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  const { data: stageMetrics } = useQuery({
    queryKey: ['stage-metrics', projectId],
    queryFn: () => getProjectStageMetrics(projectId, supabase),
  });

  const { data: health } = useQuery({
    queryKey: ['process-health', projectId],
    queryFn: () => calculateProcessHealth(projectId, supabase),
  });

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // amber
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Process Metrics</h1>
        <div className="text-sm text-gray-600">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Health Gauge */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6 md:col-span-1">
            <h3 className="text-lg font-semibold mb-4">Process Health</h3>
            <div className="flex items-center justify-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                style={{ backgroundColor: getHealthColor(health.score) }}
              >
                {health.score}
              </div>
            </div>
            <p className="text-center mt-4 text-sm text-gray-700 capitalize">
              Status: {health.status}
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Avg Phase Time</p>
            <p className="text-2xl font-bold mt-2">
              {Math.round(health.factors.avgPhaseTime)} min
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Bottleneck Stages</p>
            <p className="text-2xl font-bold mt-2">{health.factors.bottleneckCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Test Coverage</p>
            <p className="text-2xl font-bold mt-2">
              {Math.round(health.factors.testCoverage * 100)}%
            </p>
          </div>
        </div>
      )}

      {/* Stage Duration Bar Chart */}
      {stageMetrics && stageMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Stage Duration Analysis</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" angle={-45} textAnchor="end" height={100} />
              <YAxis label={{ value: 'Duration (minutes)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="averageDuration" fill="#3b82f6" name="Average" />
              <Bar dataKey="minDuration" fill="#10b981" name="Min" />
              <Bar dataKey="maxDuration" fill="#ef4444" name="Max" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Phase Velocity Line Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Phase Velocity Trend</h2>
        <p className="text-sm text-gray-600 mb-4">
          Track phase completion time over the last 20 builds
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={generateVelocityData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="build" />
            <YAxis label={{ value: 'Duration (minutes)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="duration" stroke="#3b82f6" name="Build Time" />
            <Line type="monotone" dataKey="trend" stroke="#f59e0b" name="Trend" strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottleneck Detection */}
      {stageMetrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Bottleneck Detection</h2>
          <div className="space-y-3">
            {stageMetrics
              .filter(m => m.averageDuration > 45)
              .map((metric, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded">
                  <span className="font-medium">{metric.stage}</span>
                  <span className="text-red-600 font-bold">
                    {Math.round(metric.averageDuration)} min
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function generateVelocityData() {
  return Array.from({ length: 20 }, (_, i) => ({
    build: `Build ${i + 1}`,
    duration: 120 + Math.random() * 60 - 30,
    trend: 120 - i * 2,
  }));
}
```

### 3. API Endpoint for Metrics
#### File: `app/api/v1/projects/[id]/metrics/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProjectStageMetrics, calculateProcessHealth } from '@/lib/metrics/processMetrics';
import { verifyApiKey } from '@/lib/auth/apiKeys';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 401 }
      );
    }

    const verified = await verifyApiKey(apiKey);
    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const [stageMetrics, health] = await Promise.all([
      getProjectStageMetrics(params.id, supabase),
      calculateProcessHealth(params.id, supabase),
    ]);

    return NextResponse.json({
      projectId: params.id,
      stageMetrics,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## File Structure
```
lib/
├── metrics/
│   └── processMetrics.ts (NEW)
components/
├── helix/
│   └── analytics/
│       └── ProcessMetricsDashboard.tsx (NEW)
app/
└── api/
    └── v1/
        └── projects/
            └── [id]/
                └── metrics/
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
- Supabase (data queries)
- Recharts (visualization)
- TailwindCSS v4 (styling)

---

## Acceptance Criteria
1. Dashboard displays stage duration metrics (avg, min, max) in bar chart
2. Health score calculated as composite of phase time, bottlenecks, test coverage, deployments
3. Health gauge shows color-coded status (green/amber/orange/red)
4. Phase velocity line chart displays trend over last 20 builds
5. Bottleneck detection identifies stages with above-average duration
6. Metrics API endpoint accessible at /api/v1/projects/:id/metrics
7. All API responses include timestamp and project ID
8. Dashboard responsive on mobile (1 column), tablet (2 columns), desktop (4 columns)
9. Metrics data cached with 5-minute TTL
10. All charts render without errors with empty data

---

## Testing Instructions
1. Create test project with 10+ completed phases across all stages
2. Verify stage metrics calculated correctly (sum, average, min, max)
3. Verify health score between 0-100
4. Verify bar chart displays all stages with correct values
5. Verify velocity chart shows 20 builds with trend line
6. Verify bottleneck detection highlights stages > 45 minutes
7. Call /api/v1/projects/:id/metrics with valid API key, verify response
8. Call metrics API with invalid API key, verify 401 response
9. Verify responsive layout on 320px, 768px, 1280px widths
10. Verify metrics update when new build phases complete

---

## Notes for the AI Agent
- Metrics collection should be non-blocking; consider background jobs for complex calculations
- Consider adding drill-down capability to view individual phase runs
- Future enhancement: anomaly detection in velocity trends
- Health score weights may need tuning based on team feedback
