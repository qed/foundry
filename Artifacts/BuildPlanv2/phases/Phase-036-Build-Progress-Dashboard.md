# Phase 036: Build Progress Dashboard

**Status:** Build Stage (Step 6.1) | **Phase Number:** 036 | **Epic:** 5

## Objective

Create a comprehensive visual dashboard for the Build stage that provides real-time metrics, progress visualization, and trend analysis. This dashboard enables project stakeholders to monitor build progress, estimate completion, and track phase completion velocity.

## Prerequisites

- Phase 033 complete: helix_build_phases table populated
- Phase 034-035 complete: Phases being marked as built with timestamps
- Route `/org/[orgSlug]/project/[projectId]/helix/build-dashboard` available
- Recharts library available for charting

## Epic Context (Epic 5)

Phase 036 provides visibility into the Build stage execution. By displaying metrics, progress bars, burndown charts, and completion estimates, it helps the team understand velocity and plan for the testing and deployment stages. This dashboard is the analytics layer for Step 6.1.

## Context

As phases are completed, the dashboard should update to show:
- Total phases, completed count, in-progress count, remaining count
- Percentage progress with visual bar
- Burndown chart showing phases completed over time
- Current phase highlighted with time-in-phase counter
- Recently completed phases list
- Estimated completion date based on historical velocity

This dashboard serves as a reference point during the build execution and helps identify bottlenecks.

## Detailed Requirements with Code

### 1. Server Action: Dashboard Metrics

Create `/app/actions/helix/buildDashboard.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function getBuildDashboardMetrics(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Get all phases
  const { data: phases, error } = await supabase
    .from('helix_build_phases')
    .select('*')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .order('phase_number', { ascending: true });

  if (error) throw error;

  // Calculate metrics
  const total = phases?.length || 0;
  const completed = phases?.filter(p => p.status === 'built' || p.status === 'tested').length || 0;
  const inProgress = phases?.filter(p => p.status === 'in_progress').length || 0;
  const notStarted = phases?.filter(p => p.status === 'not_started').length || 0;

  const progressPercent = total > 0 ? (completed / total) * 100 : 0;

  // Find current phase
  const currentPhase = phases?.find(p => p.status === 'in_progress');

  // Calculate average completion time
  const completedPhases = phases?.filter(
    p => p.started_at && p.completed_at && (p.status === 'built' || p.status === 'tested')
  ) || [];

  let avgCompletionTimeMs = 0;
  if (completedPhases.length > 0) {
    const totalTimeMs = completedPhases.reduce((sum, p) => {
      const startTime = new Date(p.started_at).getTime();
      const endTime = new Date(p.completed_at).getTime();
      return sum + (endTime - startTime);
    }, 0);
    avgCompletionTimeMs = totalTimeMs / completedPhases.length;
  }

  // Estimate completion
  let estimatedCompletionDate: string | null = null;
  if (inProgress > 0 || notStarted > 0) {
    const remainingPhases = inProgress + notStarted;
    const estimatedMs = remainingPhases * avgCompletionTimeMs;
    const estimatedDate = new Date(Date.now() + estimatedMs);
    estimatedCompletionDate = estimatedDate.toISOString();
  }

  return {
    total,
    completed,
    inProgress,
    notStarted,
    progressPercent,
    currentPhase,
    completedPhases,
    avgCompletionTimeMs,
    estimatedCompletionDate,
    phases
  };
}

export async function getBurndownChartData(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Get all phases ordered by completion time
  const { data: phases } = await supabase
    .from('helix_build_phases')
    .select('id, phase_number, title, status, completed_at, started_at')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .order('completed_at', { ascending: true, nullsLast: true });

  if (!phases) return [];

  // Build burndown data points
  const chartData: any[] = [];
  const allPhases = await supabase
    .from('helix_build_phases')
    .select('id')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId);

  const totalPhases = allPhases.data?.length || 0;

  // Add start point
  const firstStarted = phases.find(p => p.started_at);
  if (firstStarted) {
    chartData.push({
      date: new Date(firstStarted.started_at).toLocaleDateString(),
      timestamp: new Date(firstStarted.started_at).getTime(),
      completed: 0,
      remaining: totalPhases
    });
  }

  // Add completion points
  let completedCount = 0;
  for (const phase of phases) {
    if (phase.status === 'built' || phase.status === 'tested') {
      completedCount++;
      chartData.push({
        date: new Date(phase.completed_at).toLocaleDateString(),
        timestamp: new Date(phase.completed_at).getTime(),
        completed: completedCount,
        remaining: totalPhases - completedCount
      });
    }
  }

  // Remove duplicates (same date, keep latest)
  const uniqueData: any[] = [];
  const dateMap = new Map();

  for (const point of chartData) {
    if (!dateMap.has(point.date) || dateMap.get(point.date).timestamp < point.timestamp) {
      dateMap.set(point.date, point);
    }
  }

  return Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export async function getRecentlyCompletedPhases(
  projectId: string,
  helixProcessId: string,
  limit: number = 5
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const { data: phases } = await supabase
    .from('helix_build_phases')
    .select('id, phase_number, title, status, completed_at, commit_hash')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .filter('completed_at', 'is.not', null)
    .order('completed_at', { ascending: false })
    .limit(limit);

  return phases || [];
}
```

### 2. Route Handler for Dashboard

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/build-dashboard/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';
import BuildDashboardView from './components/BuildDashboardView';

interface PageParams {
  params: Promise<{
    orgSlug: string;
    projectId: string;
  }>;
}

export default async function BuildDashboardPage({ params }: PageParams) {
  const { orgSlug, projectId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return notFound();
  }

  // Verify project access
  const { data: project } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', projectId)
    .single();

  if (!project || project.org_id !== user.org_id) {
    return notFound();
  }

  // Get current helix process
  const { data: helixProcess } = await supabase
    .from('helix_processes')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!helixProcess) {
    return notFound();
  }

  return (
    <BuildDashboardView
      projectId={projectId}
      orgSlug={orgSlug}
      helixProcessId={helixProcess.id}
    />
  );
}
```

### 3. React Component: Dashboard View

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/build-dashboard/components/BuildDashboardView.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getBuildDashboardMetrics,
  getBurndownChartData,
  getRecentlyCompletedPhases
} from '@/app/actions/helix/buildDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Clock, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react';

interface BuildDashboardViewProps {
  projectId: string;
  orgSlug: string;
  helixProcessId: string;
}

export default function BuildDashboardView({
  projectId,
  orgSlug,
  helixProcessId
}: BuildDashboardViewProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentPhases, setRecentPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [metricsData, chartDataResult, recentPhasesData] = await Promise.all([
          getBuildDashboardMetrics(projectId, helixProcessId),
          getBurndownChartData(projectId, helixProcessId),
          getRecentlyCompletedPhases(projectId, helixProcessId, 5)
        ]);

        setMetrics(metricsData);
        setChartData(chartDataResult);
        setRecentPhases(recentPhasesData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();

    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [projectId, helixProcessId]);

  if (loading) {
    return <div className="animate-pulse">Loading dashboard...</div>;
  }

  if (!metrics) {
    return <div>No data available</div>;
  }

  // Calculate time in current phase
  let timeInPhaseHours = 0;
  if (metrics.currentPhase?.started_at) {
    const startTime = new Date(metrics.currentPhase.started_at).getTime();
    const nowTime = Date.now();
    timeInPhaseHours = Math.round((nowTime - startTime) / (1000 * 60 * 60) * 10) / 10;
  }

  // Format estimated completion
  let estimatedDateStr = 'Unknown';
  if (metrics.estimatedCompletionDate) {
    const estimatedDate = new Date(metrics.estimatedCompletionDate);
    estimatedDateStr = estimatedDate.toLocaleDateString();
  }

  const avgHours = Math.round((metrics.avgCompletionTimeMs / (1000 * 60 * 60)) * 10) / 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Build Stage Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time progress tracking and metrics</p>
        </div>
        <Link href={`/org/${orgSlug}/project/${projectId}/helix/step/6.1/`}>
          <Button variant="outline">Back to Overview</Button>
        </Link>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{metrics.total}</div>
              <div className="text-sm text-gray-600 mt-1">Total Phases</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{metrics.completed}</div>
              <div className="text-sm text-gray-600 mt-1">Completed</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500">{metrics.inProgress}</div>
              <div className="text-sm text-gray-600 mt-1">In Progress</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{metrics.notStarted}</div>
              <div className="text-sm text-gray-600 mt-1">Not Started</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {Math.round(metrics.progressPercent)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Complete</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Progress Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Overall Build Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">
                {metrics.completed} of {metrics.total} phases complete
              </span>
              <span className="text-lg font-bold">{Math.round(metrics.progressPercent)}%</span>
            </div>
            <Progress
              value={metrics.progressPercent}
              className="h-4"
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Phase Card */}
      {metrics.currentPhase && (
        <Card className="bg-blue-50 border-blue-200 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Current Phase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Phase {metrics.currentPhase.phase_number}</p>
                <p className="text-lg font-semibold">{metrics.currentPhase.title}</p>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t">
                <div>
                  <div className="text-xs text-gray-600">TIME IN PHASE</div>
                  <div className="text-lg font-bold text-blue-600">{timeInPhaseHours}h</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">AVG COMPLETION</div>
                  <div className="text-lg font-bold text-gray-700">{avgHours}h</div>
                </div>
                <Link
                  href={`/org/${orgSlug}/project/${projectId}/helix/phase/${metrics.currentPhase.id}`}
                  className="ml-auto"
                >
                  <Button size="sm">Go to Phase</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Burndown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Burndown Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  name="Completed Phases"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="remaining"
                  stroke="#ef4444"
                  name="Remaining Phases"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No completion data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estimated Completion & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Velocity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">Average time per phase</div>
              <div className="text-3xl font-bold text-blue-600">{avgHours}h</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Estimated remaining</div>
              <div className="text-lg font-semibold">
                {metrics.inProgress + metrics.notStarted} phases
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Estimated Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">Estimated date</div>
              <div className="text-3xl font-bold text-green-600">{estimatedDateStr}</div>
            </div>
            <div className="text-xs text-gray-500 pt-2">
              Based on {metrics.completedPhases.length} completed phases
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Completed Phases */}
      {recentPhases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Completed Phases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPhases.map(phase => (
                <div
                  key={phase.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div>
                    <p className="font-semibold">Phase {phase.phase_number}: {phase.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Completed: {new Date(phase.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  {phase.commit_hash && (
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {phase.commit_hash.substring(0, 8)}
                    </code>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## File Structure

```
/app/(app)/org/[orgSlug]/project/[projectId]/helix/build-dashboard/
├── page.tsx (route handler)
├── components/
│   └── BuildDashboardView.tsx (main dashboard)
/app/actions/helix/
├── buildDashboard.ts (server actions)
```

## Dependencies

- React hooks: `useState`, `useEffect`
- `recharts` - Charts and visualizations
- UI Components: `Card`, `Progress`, `Button`
- Icons: `lucide-react` (Clock, TrendingDown, CheckCircle2, AlertCircle)

## Tech Stack

- **Frontend:** Next.js 16+, TypeScript, React, Tailwind CSS v4
- **Charts:** Recharts library
- **Backend:** Supabase PostgreSQL
- **State:** React hooks + Server Actions

## Acceptance Criteria

1. Dashboard displays 5-column metric grid (total, completed, in progress, not started, percent)
2. Overall progress bar shows percentage and visual fill
3. Current phase card highlighted in blue with phase number, title, and time tracking
4. Time in current phase calculated and updated in real-time
5. Average completion time calculated from historical data
6. Burndown chart displays completed vs. remaining phases over time
7. Estimated completion date calculated based on velocity
8. Recently completed phases list shows last 5 completed with commit hashes
9. Dashboard auto-refreshes every 30 seconds
10. All metrics responsive and readable on mobile devices

## Testing Instructions

1. **Metrics Display:**
   - Verify all 5 metrics cards display correct counts
   - Verify sum of completed + in_progress + not_started = total

2. **Progress Bar:**
   - Verify progress percentage calculated correctly
   - Verify visual fill matches percentage

3. **Current Phase:**
   - Mark a phase as in_progress
   - Verify current phase card displays
   - Verify phase number and title correct

4. **Time Tracking:**
   - Start a phase
   - Wait a few minutes
   - Refresh dashboard
   - Verify time in phase increases

5. **Burndown Chart:**
   - Complete several phases
   - Verify chart displays completion timeline
   - Verify trend line decreasing

6. **Velocity Calculation:**
   - Complete phases with varying completion times
   - Verify average is calculated correctly
   - Verify estimated completion date updates

7. **Recently Completed:**
   - Complete phases
   - Verify they appear in recently completed list
   - Verify most recent at top

8. **Auto-Refresh:**
   - Complete a phase in another browser tab
   - Observe dashboard refresh in 30 seconds
   - Verify metrics update

9. **No Data State:**
   - Test with no completed phases
   - Verify chart shows "No completion data yet"
   - Verify estimated date shows "Unknown"

10. **Responsive Design:**
    - Test on mobile, tablet, desktop
    - Verify all charts readable
    - Verify grid adapts

## Notes for AI Agent

- The dashboard is a read-only analytics view
- Metrics are calculated from helix_build_phases.status and timestamps
- Burndown data is derived from completed_at timestamps
- Auto-refresh interval is 30 seconds to prevent excessive queries
- Time in phase is calculated in real-time using Date.now()
- Velocity is calculated only from phases with both started_at and completed_at
- Estimated completion assumes constant velocity (not accounting for acceleration/deceleration)
- If no phases completed yet, velocity is unknown and estimates unavailable
- The dashboard should be accessible from the main helix navigation
- Consider caching metrics data to prevent N+1 queries on large phase counts
