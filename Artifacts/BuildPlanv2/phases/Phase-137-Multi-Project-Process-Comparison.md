# Phase 137 — Multi-Project Process Comparison

## Objective
Enable organizations to compare Helix process metrics across multiple projects side-by-side, identifying org-wide performance patterns and optimizing processes based on comparative analysis.

## Prerequisites
- Phase 136 — Process Metrics Dashboard — Establishes metrics infrastructure

## Epic Context
**Epic:** 17 — Process Analytics & Reporting
**Phase:** 137 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Teams across an organization run different projects but follow the same Helix process. By comparing metrics across projects, org leadership can identify which projects are running efficiently, which stages consistently create bottlenecks, and where process improvements would have the most impact.

This comparative view reveals patterns invisible at the individual project level. For example, an organization might discover that API integration stages take 2x longer in mobile projects than web projects, prompting template or process customization.

---

## Detailed Requirements

### 1. Comparison Query Functions
#### File: `lib/metrics/projectComparison.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface ProjectComparisonMetrics {
  projectId: string;
  projectName: string;
  totalDuration: number; // minutes
  phaseCount: number;
  averagePhaseTime: number;
  testCoverage: number;
  bottleneckStages: string[];
  deploymentCount: number;
  healthScore: number;
  createdAt: Date;
}

export async function getOrgProjectComparison(
  orgId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<ProjectComparisonMetrics[]> {
  // Get all projects in org
  const { data: projects, error: projectError } = await supabaseClient
    .from('projects')
    .select('id, name')
    .eq('org_id', orgId);

  if (projectError) throw projectError;

  const comparisons: ProjectComparisonMetrics[] = [];

  for (const project of projects || []) {
    // Get process metrics for each project
    const { data: phases } = await supabaseClient
      .from('helix_build_phases')
      .select(`
        duration_minutes,
        status
      `)
      .eq('project_id', project.id)
      .eq('status', 'completed');

    const { data: stageHistory } = await supabaseClient
      .from('helix_process_stage_history')
      .select('stage_name, started_at, completed_at')
      .eq('project_id', project.id)
      .not('completed_at', 'is', null);

    const { data: tests } = await supabaseClient
      .from('helix_test_results')
      .select('passed, total')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: deployments } = await supabaseClient
      .from('helix_deployments')
      .select('id')
      .eq('project_id', project.id);

    // Calculate metrics
    const totalDuration = phases?.reduce((sum, p) => sum + (p.duration_minutes || 0), 0) || 0;
    const phaseCount = phases?.length || 0;
    const averagePhaseTime = phaseCount > 0 ? totalDuration / phaseCount : 0;

    const stageGroups = new Map<string, number[]>();
    stageHistory?.forEach((record: any) => {
      const duration = new Date(record.completed_at).getTime() -
                       new Date(record.started_at).getTime();
      const minutes = duration / (1000 * 60);
      if (!stageGroups.has(record.stage_name)) {
        stageGroups.set(record.stage_name, []);
      }
      stageGroups.get(record.stage_name)!.push(minutes);
    });

    const avgStageTime = Array.from(stageGroups.values())
      .map(durations => durations.reduce((a, b) => a + b, 0) / durations.length)
      .reduce((a, b) => a + b, 0) / (stageGroups.size || 1);

    const bottlenecks = Array.from(stageGroups.entries())
      .filter(([_, durations]) => {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        return avg > avgStageTime * 1.5;
      })
      .map(([stage]) => stage);

    const testCoverage = tests?.[0] ? tests[0].passed / tests[0].total : 0;
    const deploymentCount = deployments?.length || 0;

    // Simple health score for comparison
    const healthScore = Math.round(
      (25 * (60 / Math.max(averagePhaseTime, 1))) +
      Math.max(0, 25 - bottlenecks.length * 5) +
      (testCoverage * 25) +
      Math.min(25, deploymentCount * 5)
    );

    comparisons.push({
      projectId: project.id,
      projectName: project.name,
      totalDuration,
      phaseCount,
      averagePhaseTime,
      testCoverage,
      bottleneckStages: bottlenecks,
      deploymentCount,
      healthScore,
      createdAt: new Date(),
    });
  }

  return comparisons.sort((a, b) => b.healthScore - a.healthScore);
}

export async function getStageComparisonAcrossProjects(
  orgId: string,
  stageName: string,
  supabaseClient: ReturnType<typeof createClient>
) {
  const { data: projects } = await supabaseClient
    .from('projects')
    .select('id, name')
    .eq('org_id', orgId);

  const stageMetrics = [];

  for (const project of projects || []) {
    const { data: stages } = await supabaseClient
      .from('helix_process_stage_history')
      .select('started_at, completed_at')
      .eq('project_id', project.id)
      .eq('stage_name', stageName)
      .not('completed_at', 'is', null);

    if (!stages || stages.length === 0) continue;

    const durations = stages.map((s: any) =>
      (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / (1000 * 60)
    );

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const sorted = durations.sort((a, b) => a - b);

    stageMetrics.push({
      projectId: project.id,
      projectName: project.name,
      averageDuration: avg,
      minDuration: sorted[0],
      maxDuration: sorted[sorted.length - 1],
      completionCount: stages.length,
    });
  }

  return stageMetrics.sort((a, b) => b.averageDuration - a.averageDuration);
}
```

### 2. Comparison Component
#### File: `components/helix/analytics/ProjectComparison.tsx` (NEW)
```typescript
'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getOrgProjectComparison } from '@/lib/metrics/projectComparison';
import { createClient } from '@/lib/supabase/client';

interface ProjectComparisonProps {
  orgId: string;
}

export function ProjectComparison({ orgId }: ProjectComparisonProps) {
  const supabase = createClient();

  const { data: comparisons, isLoading } = useQuery({
    queryKey: ['org-project-comparison', orgId],
    queryFn: () => getOrgProjectComparison(orgId, supabase),
  });

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Project Comparison</h1>
        <p className="text-sm text-gray-600">
          {comparisons?.length || 0} projects analyzed
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Project</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Health</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Avg Phase Time</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Total Duration</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Test Coverage</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Deployments</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Bottlenecks</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {comparisons?.map((project) => (
              <tr key={project.projectId} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{project.projectName}</td>
                <td className="px-6 py-3 text-right">
                  <span
                    className="px-3 py-1 rounded-full text-white text-sm font-semibold"
                    style={{ backgroundColor: getHealthColor(project.healthScore) }}
                  >
                    {project.healthScore}
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-sm">
                  {Math.round(project.averagePhaseTime)} min
                </td>
                <td className="px-6 py-3 text-right text-sm">
                  {Math.round(project.totalDuration)} min
                </td>
                <td className="px-6 py-3 text-right text-sm">
                  {Math.round(project.testCoverage * 100)}%
                </td>
                <td className="px-6 py-3 text-right text-sm">
                  {project.deploymentCount}
                </td>
                <td className="px-6 py-3 text-right text-sm">
                  <span className="text-red-600 font-semibold">
                    {project.bottleneckStages.length}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scatter: Health vs Duration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Health Score vs Project Duration</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="totalDuration" name="Duration (min)" />
            <YAxis dataKey="healthScore" name="Health Score" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              name="Projects"
              data={comparisons || []}
              fill="#3b82f6"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Health Score Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Health Score Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisons || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="projectName" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="healthScore" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Insights */}
      {comparisons && comparisons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Best Performer</h3>
            <p className="text-lg font-bold text-green-600">
              {comparisons[0]?.projectName}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Health Score: {comparisons[0]?.healthScore}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Most Bottlenecks</h3>
            <p className="text-lg font-bold text-red-600">
              {comparisons.reduce((max, p) =>
                p.bottleneckStages.length > max.bottleneckStages.length ? p : max
              )?.projectName}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Bottlenecks: {Math.max(...(comparisons?.map(p => p.bottleneckStages.length) || [0]))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Comparison API Endpoint
#### File: `app/api/v1/orgs/[id]/projects/comparison/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgProjectComparison, getStageComparisonAcrossProjects } from '@/lib/metrics/projectComparison';
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

    const stageName = request.nextUrl.searchParams.get('stage');
    const supabase = createClient();

    if (stageName) {
      const stageComparison = await getStageComparisonAcrossProjects(params.id, stageName, supabase);
      return NextResponse.json({
        orgId: params.id,
        stageName,
        stageComparison,
        timestamp: new Date().toISOString(),
      });
    }

    const projectComparison = await getOrgProjectComparison(params.id, supabase);
    return NextResponse.json({
      orgId: params.id,
      projectComparison,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Comparison API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
lib/
├── metrics/
│   └── projectComparison.ts (NEW)
components/
├── helix/
│   └── analytics/
│       └── ProjectComparison.tsx (NEW)
app/
└── api/
    └── v1/
        └── orgs/
            └── [id]/
                └── projects/
                    └── comparison/
                        └── route.ts (NEW)
```

---

## Dependencies
- @tanstack/react-query: ^5.28.0
- recharts: ^2.10.0
- Supabase client: existing

---

## Tech Stack for This Phase
- Next.js 16+ (API routes, Server Components)
- TypeScript
- Supabase (multi-project queries)
- Recharts (scatter and bar charts)
- TailwindCSS v4 (styling)

---

## Acceptance Criteria
1. Comparison table displays all org projects with health scores, durations, test coverage
2. Scatter chart correctly plots health score vs project duration
3. Bar chart displays health scores for each project
4. Best performer and most bottlenecked project identified and displayed
5. Stage-specific comparison available via ?stage=StageName query parameter
6. API endpoint accessible at /api/v1/orgs/:id/projects/comparison
7. Comparison data includes project name, metrics, and bottleneck list
8. Table responsive on mobile with horizontal scroll
9. Metrics aggregated across all projects in organization
10. Comparison data cached with 10-minute TTL

---

## Testing Instructions
1. Create org with 5+ projects, each with 10+ completed phases
2. Verify table displays all projects and correct metrics
3. Verify scatter chart plots data correctly with no overlaps
4. Verify health scores range from 0-100
5. Call API with valid key, verify org-level comparison returned
6. Call API with ?stage=CodeReview, verify stage-specific data returned
7. Verify best performer card shows highest health score project
8. Verify bottleneck card shows project with most problematic stages
9. Verify responsive layout on 320px, 768px, 1280px widths
10. Verify metrics update when new projects or phases are completed

---

## Notes for the AI Agent
- Consider adding filters for project type, date range, or team
- Future enhancement: trend comparison (how project metrics change over time)
- Performance optimization: batch queries per project to avoid N+1 issues
- Consider exporting comparison as CSV for stakeholder reports
