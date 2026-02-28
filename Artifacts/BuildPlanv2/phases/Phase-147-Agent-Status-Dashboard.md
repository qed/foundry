# Phase 147 — Agent Status Dashboard

## Objective
Monitor external agents (Claude Code, GitHub Actions, custom agents via MCP) with a dashboard displaying active agents, current work, recent actions, and error rates in real-time.

## Prerequisites
- Phase 143 — Claude Code Direct Integration — Agent tracking infrastructure
- Phase 145 — CI/CD Pipeline Integration — External agent patterns

## Epic Context
**Epic:** 18 — MCP & External Agent Integration
**Phase:** 147 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Multiple external agents now work autonomously on Helix phases: Claude Code builds code, GitHub Actions runs tests, Vercel deploys. Teams need visibility into what agents are doing, which are active, error rates, and recent completions. The Agent Status Dashboard provides this real-time view.

This phase builds the monitoring UI and supporting queries to surface agent activity.

---

## Detailed Requirements

### 1. Agent Monitoring Service
#### File: `lib/agents/agentMonitoring.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface AgentStatus {
  id: string;
  type: 'claude-code' | 'github-actions' | 'vercel' | 'custom';
  name: string;
  status: 'idle' | 'working' | 'error' | 'offline';
  currentTask?: string;
  currentPhase?: number;
  errorCount: number;
  successCount: number;
  lastActiveAt: Date;
  uptimePercent: number;
}

export interface AgentActivity {
  id: string;
  agentId: string;
  agentType: string;
  action: string; // build, test, deploy, review
  targetEntity: string;
  status: 'in_progress' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // seconds
  result?: any;
}

export async function getProjectAgentStatus(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<AgentStatus[]> {
  // Get all external builds for this project
  const { data: builds } = await supabaseClient
    .from('helix_external_builds')
    .select('*')
    .eq('project_id', projectId)
    .order('completed_at', { ascending: false })
    .limit(100);

  // Get all CI/CD events
  const { data: cicdEvents } = await supabaseClient
    .from('helix_cicd_events')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100);

  const agents = new Map<string, AgentStatus>();

  // Process builds
  builds?.forEach((build: any) => {
    const agentId = `${build.external_agent}-${build.session_id}`;
    const agentType = build.external_agent as any;

    if (!agents.has(agentId)) {
      agents.set(agentId, {
        id: agentId,
        type: agentType,
        name: `${agentType}-${build.session_id.slice(0, 8)}`,
        status: build.status === 'completed' ? 'idle' :
                build.status === 'failed' ? 'error' : 'working',
        currentPhase: build.phase_number,
        errorCount: 0,
        successCount: 0,
        lastActiveAt: new Date(build.completed_at || build.started_at),
        uptimePercent: 100,
      });
    }

    const agent = agents.get(agentId)!;
    if (build.status === 'completed') agent.successCount++;
    if (build.status === 'failed') agent.errorCount++;
  });

  // Process CICD events
  cicdEvents?.forEach((event: any) => {
    const agentId = `${event.pipeline_source}-${event.workflow_id}`;

    if (!agents.has(agentId)) {
      agents.set(agentId, {
        id: agentId,
        type: event.pipeline_source as any,
        name: event.workflow_name,
        status: event.status === 'success' ? 'idle' :
                event.status === 'failure' ? 'error' : 'working',
        errorCount: 0,
        successCount: 0,
        lastActiveAt: new Date(event.created_at),
        uptimePercent: 100,
      });
    }

    const agent = agents.get(agentId)!;
    if (event.status === 'success') agent.successCount++;
    if (event.status === 'failure') agent.errorCount++;
  });

  // Calculate uptime percentage
  agents.forEach((agent) => {
    const total = agent.successCount + agent.errorCount;
    if (total > 0) {
      agent.uptimePercent = Math.round((agent.successCount / total) * 100);
    }
  });

  return Array.from(agents.values())
    .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
}

export async function getAgentActivityLog(
  projectId: string,
  limit: number = 50,
  supabaseClient: ReturnType<typeof createClient>
): Promise<AgentActivity[]> {
  const { data: builds } = await supabaseClient
    .from('helix_external_builds')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return builds?.map((build: any) => ({
    id: build.id,
    agentId: build.session_id,
    agentType: build.external_agent,
    action: 'build',
    targetEntity: `Phase ${build.phase_number}`,
    status: build.status === 'in_progress' ? 'in_progress' :
            build.status === 'completed' ? 'completed' : 'failed',
    startedAt: new Date(build.started_at),
    completedAt: build.completed_at ? new Date(build.completed_at) : undefined,
    duration: build.completed_at ?
      (new Date(build.completed_at).getTime() - new Date(build.started_at).getTime()) / 1000 :
      undefined,
  })) || [];
}

export async function getAgentErrorReport(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<any> {
  const { data: failedBuilds } = await supabaseClient
    .from('helix_external_builds')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: failedCicd } = await supabaseClient
    .from('helix_cicd_events')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'failure')
    .order('created_at', { ascending: false })
    .limit(20);

  const errors = [
    ...(failedBuilds || []).map((build: any) => ({
      type: 'build',
      agent: build.external_agent,
      phase: build.phase_number,
      timestamp: new Date(build.completed_at),
      message: build.error_message,
    })),
    ...(failedCicd || []).map((event: any) => ({
      type: 'cicd',
      agent: event.pipeline_source,
      workflow: event.workflow_name,
      timestamp: new Date(event.completed_at || event.created_at),
    })),
  ];

  return errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
```

### 2. Agent Status Dashboard Component
#### File: `components/helix/monitoring/AgentStatusDashboard.tsx` (NEW)
```typescript
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface AgentStatusDashboardProps {
  projectId: string;
}

export function AgentStatusDashboard({ projectId }: AgentStatusDashboardProps) {
  const supabase = createClient();

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['agent-status', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/helix/projects/${projectId}/agents/status`);
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json();
    },
    refetchInterval: 10000, // Poll every 10s
  });

  const { data: activity } = useQuery({
    queryKey: ['agent-activity', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/helix/projects/${projectId}/agents/activity`);
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    },
    refetchInterval: 15000,
  });

  const { data: errors } = useQuery({
    queryKey: ['agent-errors', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/helix/projects/${projectId}/agents/errors`);
      if (!response.ok) throw new Error('Failed to fetch errors');
      return response.json();
    },
    refetchInterval: 30000,
  });

  const getStatusColor = (status: string) => {
    if (status === 'working') return 'text-blue-600';
    if (status === 'error') return 'text-red-600';
    if (status === 'idle') return 'text-green-600';
    return 'text-gray-600';
  };

  const getStatusBg = (status: string) => {
    if (status === 'working') return 'bg-blue-50';
    if (status === 'error') return 'bg-red-50';
    if (status === 'idle') return 'bg-green-50';
    return 'bg-gray-50';
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Agent Status</h1>
        <span className="text-sm text-gray-600">
          Updated {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Active Agents Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Active Agents</h2>
        {agentsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents?.agents?.map((agent: any) => (
              <div key={agent.id} className={`rounded-lg shadow p-4 ${getStatusBg(agent.status)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{agent.name}</p>
                    <p className="text-xs text-gray-600 capitalize">{agent.type}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>

                {agent.currentPhase && (
                  <p className="text-sm text-gray-700 mb-2">
                    Working on Phase {agent.currentPhase}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Success</p>
                    <p className="font-bold text-green-600">{agent.successCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Errors</p>
                    <p className="font-bold text-red-600">{agent.errorCount}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Uptime</span>
                    <span className="font-semibold">{agent.uptimePercent}%</span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2 mt-1">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${agent.uptimePercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Agent</th>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
                <th className="px-4 py-3 text-left font-semibold">Target</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activity?.activities?.map((act: any) => (
                <tr key={act.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{act.agentType}</td>
                  <td className="px-4 py-3 capitalize">{act.action}</td>
                  <td className="px-4 py-3">{act.targetEntity}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      act.status === 'completed' ? 'bg-green-100 text-green-700' :
                      act.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {act.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {act.duration ? Math.round(act.duration / 60) + 'm' : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Summary */}
      {errors?.errors?.length > 0 && (
        <div className="bg-red-50 rounded-lg shadow p-6 border-l-4 border-red-600">
          <h2 className="text-xl font-semibold text-red-900 mb-4">Recent Errors</h2>
          <div className="space-y-2">
            {errors.errors.slice(0, 5).map((error: any, idx: number) => (
              <div key={idx} className="text-sm text-red-800">
                <p className="font-medium">{error.agent} — {error.type}</p>
                <p className="text-red-700 text-xs mt-1">
                  {new Date(error.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Agent Status API Endpoints
#### File: `app/api/v1/helix/projects/[projectId]/agents/status/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProjectAgentStatus } from '@/lib/agents/agentMonitoring';
import { verifyApiKey } from '@/lib/auth/apiKeys';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
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

    const supabase = createClient();
    const agents = await getProjectAgentStatus(params.projectId, supabase);

    return NextResponse.json({
      projectId: params.projectId,
      agents,
      count: agents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Agent status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
lib/
└── agents/
    └── agentMonitoring.ts (NEW)
components/
└── helix/
    └── monitoring/
        └── AgentStatusDashboard.tsx (NEW)
app/
└── api/
    └── v1/
        └── helix/
            └── projects/
                └── [projectId]/
                    └── agents/
                        ├── status/
                        │   └── route.ts (NEW)
                        ├── activity/
                        │   └── route.ts (NEW)
                        └── errors/
                            └── route.ts (NEW)
```

---

## Dependencies
- @tanstack/react-query: ^5.28.0
- Supabase: existing

---

## Tech Stack for This Phase
- Next.js 16+ (API routes)
- TypeScript
- Supabase (agent data queries)
- React (UI components)
- TailwindCSS v4

---

## Acceptance Criteria
1. Agent status dashboard displays all active agents
2. Each agent card shows type, status, success/error counts
3. Uptime percentage calculated from success/total ratio
4. Current phase displayed for agents actively working
5. Recent activity table shows last 50 agent actions
6. Error summary displays last 5 errors with timestamps
7. Dashboard auto-refreshes every 10-15 seconds
8. Status color-coded (working=blue, error=red, idle=green)
9. API endpoints return agent status, activity, and error data
10. All data secured with API key authentication

---

## Testing Instructions
1. Trigger multiple phase builds with Claude Code (creates agents)
2. Verify agent cards appear on dashboard
3. Verify status shows 'working' while builds in progress
4. Verify status changes to 'idle' when builds complete
5. Check success count increments on completion
6. Simulate build failure, verify error count increments
7. Verify uptime percentage calculated correctly
8. Check activity table displays build actions
9. Verify error summary shows failed builds
10. Verify dashboard auto-refreshes data

---

## Notes for the AI Agent
- Consider adding agent filtering by type
- Future enhancement: agent performance metrics (avg build time)
- Consider adding agent health alerts for high error rates
- Display last 24 hours of activity by default with date range filter option
- Consider webhook notifications for agent failures
