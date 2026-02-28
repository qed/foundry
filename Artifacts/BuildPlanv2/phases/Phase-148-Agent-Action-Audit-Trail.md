# Phase 148 — Agent Action Audit Trail

## Objective
Log all external agent actions (read/update/create) with agent type, action, target entity, timestamp, and result. Provide queryable audit log, anomaly detection, and integration with sync audit trail from Phase 124.

## Prerequisites
- Phase 124 — Sync Audit Trail — Audit infrastructure and patterns
- Phase 147 — Agent Status Dashboard — Agent activity tracking

## Epic Context
**Epic:** 18 — MCP & External Agent Integration
**Phase:** 148 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
External agents autonomously make changes: Claude Code writes files, GitHub Actions updates status, Vercel deploys. For compliance, debugging, and anomaly detection, every agent action must be audited. The audit trail captures what agent did what, when, to what, and with what result.

This enables forensic analysis ("what changed in production last night?"), anomaly detection ("unusual deployment patterns"), and compliance reporting.

---

## Detailed Requirements

### 1. Agent Audit Log Service
#### File: `lib/audit/agentAuditLog.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface AgentAuditLog {
  id?: string;
  agentType: 'claude-code' | 'github-actions' | 'vercel' | 'custom';
  agentId: string;
  action: 'read' | 'update' | 'create' | 'delete';
  targetEntity: string; // e.g., 'file:/src/index.ts', 'deployment:prod', 'pr:123'
  targetProject: string;
  result: 'success' | 'failure' | 'partial';
  metadata?: any;
  timestamp?: Date;
}

export async function logAgentAction(
  log: AgentAuditLog,
  supabaseClient: ReturnType<typeof createClient>
): Promise<string> {
  const { data, error } = await supabaseClient
    .from('helix_agent_audit_log')
    .insert([
      {
        agent_type: log.agentType,
        agent_id: log.agentId,
        action: log.action,
        target_entity: log.targetEntity,
        target_project: log.targetProject,
        result: log.result,
        metadata: log.metadata,
      },
    ])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getProjectAuditLog(
  projectId: string,
  filters?: {
    agentType?: string;
    action?: string;
    result?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100,
  supabaseClient?: ReturnType<typeof createClient>
): Promise<AgentAuditLog[]> {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  let query = supabaseClient
    .from('helix_agent_audit_log')
    .select('*')
    .eq('target_project', projectId)
    .order('created_at', { ascending: false });

  if (filters?.agentType) {
    query = query.eq('agent_type', filters.agentType);
  }
  if (filters?.action) {
    query = query.eq('action', filters.action);
  }
  if (filters?.result) {
    query = query.eq('result', filters.result);
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString());
  }

  const { data, error } = await query.limit(limit);

  if (error) throw error;
  return data || [];
}

export async function detectAnomalies(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<any[]> {
  // Get last 30 days of agent actions
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const logs = await getProjectAuditLog(
    projectId,
    { startDate: thirtyDaysAgo },
    1000,
    supabaseClient
  );

  const anomalies = [];

  // Detect: High failure rate for specific agent
  const byAgent = new Map<string, { success: number; failure: number }>();
  logs.forEach((log: any) => {
    const key = `${log.agent_type}-${log.agent_id}`;
    if (!byAgent.has(key)) {
      byAgent.set(key, { success: 0, failure: 0 });
    }
    const stats = byAgent.get(key)!;
    if (log.result === 'success') stats.success++;
    else if (log.result === 'failure') stats.failure++;
  });

  byAgent.forEach((stats, agentKey) => {
    const total = stats.success + stats.failure;
    const failureRate = stats.failure / total;
    if (failureRate > 0.3 && total >= 5) {
      anomalies.push({
        type: 'high_failure_rate',
        agent: agentKey,
        failureRate: (failureRate * 100).toFixed(1),
        total,
      });
    }
  });

  // Detect: Unusual activity patterns (e.g., large number of creates)
  const actionCounts = new Map<string, number>();
  logs.forEach((log: any) => {
    const key = log.action;
    actionCounts.set(key, (actionCounts.get(key) || 0) + 1);
  });

  const avgCreates = (actionCounts.get('create') || 0) / 30;
  const avgDeletes = (actionCounts.get('delete') || 0) / 30;

  if (avgCreates > 100) {
    anomalies.push({
      type: 'high_create_rate',
      action: 'create',
      averagePerDay: avgCreates.toFixed(1),
    });
  }
  if (avgDeletes > 10) {
    anomalies.push({
      type: 'high_delete_rate',
      action: 'delete',
      averagePerDay: avgDeletes.toFixed(1),
    });
  }

  return anomalies;
}

export async function getAgentActionTimeline(
  projectId: string,
  startDate: Date,
  endDate: Date,
  supabaseClient: ReturnType<typeof createClient>
): Promise<AgentAuditLog[]> {
  return getProjectAuditLog(
    projectId,
    { startDate, endDate },
    500,
    supabaseClient
  );
}
```

### 2. Agent Audit Log Schema
#### File: `migrations/add_helix_agent_audit_log.sql` (NEW)
```sql
CREATE TABLE IF NOT EXISTS helix_agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL, -- claude-code, github-actions, vercel, custom
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL, -- read, update, create, delete
  target_entity TEXT NOT NULL, -- file:/path, deployment:name, pr:id
  target_project UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  result TEXT NOT NULL, -- success, failure, partial
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT valid_action CHECK (action IN ('read', 'update', 'create', 'delete')),
  CONSTRAINT valid_result CHECK (result IN ('success', 'failure', 'partial'))
);

CREATE INDEX idx_agent_audit_project ON helix_agent_audit_log(target_project);
CREATE INDEX idx_agent_audit_agent ON helix_agent_audit_log(agent_type, agent_id);
CREATE INDEX idx_agent_audit_action ON helix_agent_audit_log(action);
CREATE INDEX idx_agent_audit_result ON helix_agent_audit_log(result);
CREATE INDEX idx_agent_audit_created ON helix_agent_audit_log(created_at);

ALTER TABLE helix_agent_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org audit logs"
  ON helix_agent_audit_log FOR SELECT
  USING (
    target_project IN (
      SELECT id FROM projects WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );
```

### 3. Audit Log Query Component
#### File: `components/helix/audit/AgentAuditLog.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface AgentAuditLogProps {
  projectId: string;
}

export function AgentAuditLog({ projectId }: AgentAuditLogProps) {
  const supabase = createClient();
  const [filters, setFilters] = useState({
    agentType: '',
    action: '',
    result: '',
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['agent-audit-log', projectId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.agentType) params.append('agentType', filters.agentType);
      if (filters.action) params.append('action', filters.action);
      if (filters.result) params.append('result', filters.result);

      const response = await fetch(
        `/api/v1/helix/projects/${projectId}/audit-log?${params.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    },
  });

  const { data: anomalies } = useQuery({
    queryKey: ['audit-anomalies', projectId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/helix/projects/${projectId}/audit-anomalies`
      );
      if (!response.ok) throw new Error('Failed to fetch anomalies');
      return response.json();
    },
  });

  const getActionColor = (action: string) => {
    if (action === 'create') return 'bg-green-100 text-green-700';
    if (action === 'update') return 'bg-blue-100 text-blue-700';
    if (action === 'delete') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getResultColor = (result: string) => {
    if (result === 'success') return 'text-green-600';
    if (result === 'failure') return 'text-red-600';
    return 'text-yellow-600';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold">Agent Audit Trail</h1>

      {/* Anomalies Alert */}
      {anomalies?.anomalies?.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-600 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Detected Anomalies</h3>
          <ul className="space-y-1 text-sm text-yellow-800">
            {anomalies.anomalies.map((anomaly: any, idx: number) => (
              <li key={idx}>
                {anomaly.type === 'high_failure_rate' &&
                  `High failure rate for ${anomaly.agent}: ${anomaly.failureRate}% (${anomaly.total} actions)`}
                {anomaly.type === 'high_create_rate' &&
                  `Unusual create rate: ${anomaly.averagePerDay}/day average`}
                {anomaly.type === 'high_delete_rate' &&
                  `Unusual delete rate: ${anomaly.averagePerDay}/day average`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium mb-1">Agent Type</label>
          <select
            value={filters.agentType}
            onChange={(e) => setFilters({ ...filters, agentType: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Agents</option>
            <option value="claude-code">Claude Code</option>
            <option value="github-actions">GitHub Actions</option>
            <option value="vercel">Vercel</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Action</label>
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="read">Read</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Result</label>
          <select
            value={filters.result}
            onChange={(e) => setFilters({ ...filters, result: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Results</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="partial">Partial</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
              <th className="px-4 py-3 text-left font-semibold">Agent</th>
              <th className="px-4 py-3 text-left font-semibold">Action</th>
              <th className="px-4 py-3 text-left font-semibold">Target</th>
              <th className="px-4 py-3 text-left font-semibold">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-gray-600">
                  Loading...
                </td>
              </tr>
            ) : logs?.logs?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-gray-600">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs?.logs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{log.agent_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs truncate max-w-xs">
                    {log.target_entity}
                  </td>
                  <td className={`px-4 py-3 font-semibold capitalize ${getResultColor(log.result)}`}>
                    {log.result}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats Summary */}
      {logs?.logs && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {logs.logs.filter((l: any) => l.result === 'success').length}
            </p>
            <p className="text-sm text-gray-600">Successful</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {logs.logs.filter((l: any) => l.result === 'failure').length}
            </p>
            <p className="text-sm text-gray-600">Failed</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {logs.logs.filter((l: any) => l.action === 'create').length}
            </p>
            <p className="text-sm text-gray-600">Created</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {new Set(logs.logs.map((l: any) => `${l.agent_type}-${l.agent_id}`)).size}
            </p>
            <p className="text-sm text-gray-600">Unique Agents</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4. Audit Log API Endpoints
#### File: `app/api/v1/helix/projects/[projectId]/audit-log/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProjectAuditLog } from '@/lib/audit/agentAuditLog';
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

    const agentType = request.nextUrl.searchParams.get('agentType') || undefined;
    const action = request.nextUrl.searchParams.get('action') || undefined;
    const result = request.nextUrl.searchParams.get('result') || undefined;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');

    const supabase = createClient();
    const logs = await getProjectAuditLog(
      params.projectId,
      { agentType: agentType || undefined, action, result },
      limit,
      supabase
    );

    return NextResponse.json({
      projectId: params.projectId,
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error('Audit log API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
migrations/
└── add_helix_agent_audit_log.sql (NEW)
lib/
└── audit/
    └── agentAuditLog.ts (NEW)
components/
└── helix/
    └── audit/
        └── AgentAuditLog.tsx (NEW)
app/
└── api/
    └── v1/
        └── helix/
            └── projects/
                └── [projectId]/
                    ├── audit-log/
                    │   └── route.ts (NEW)
                    └── audit-anomalies/
                        └── route.ts (NEW)
```

---

## Dependencies
- Supabase: existing
- @tanstack/react-query: ^5.28.0

---

## Tech Stack for This Phase
- Next.js 16+ (API routes)
- TypeScript
- Supabase (audit storage and RLS)
- React (UI components)
- TailwindCSS v4

---

## Acceptance Criteria
1. All agent actions logged to helix_agent_audit_log table
2. Audit log captures agent type, ID, action, target, result
3. Timestamps recorded for all actions
4. Queryable filters for agent type, action, and result
5. Anomaly detection identifies high failure rates
6. Anomaly detection identifies unusual activity patterns
7. UI displays audit log with filtering capabilities
8. Statistics summary shows success/failure counts
9. Anomalies displayed as alert at top of log view
10. API endpoint supports filtering and limit parameters

---

## Testing Instructions
1. Log agent action for 'claude-code' creating a file
2. Log agent action for 'github-actions' updating deployment status
3. Log multiple failures for same agent
4. Query audit log with agentType filter, verify correct results
5. Query with action='create' filter, verify only creates returned
6. Verify anomaly detection identifies high failure rate (>30%)
7. Verify anomaly detection identifies unusual create patterns
8. View UI, verify all logged actions displayed
9. Apply filters, verify results filtered correctly
10. Verify timestamp and result color coding in UI

---

## Notes for the AI Agent
- Consider adding export functionality (CSV) for compliance reporting
- Future enhancement: retention policy (e.g., keep logs for 1 year)
- Integrate with Phase 124 sync audit trail for unified audit view
- Consider webhook for anomaly alerts
- Future enhancement: detailed metadata logging for each action type
