# Phase 145 — CI/CD Pipeline Integration

## Objective
Integrate with CI/CD systems (GitHub Actions, Vercel) to auto-update build phase status based on pipeline results, display pipeline status per deployment, and receive webhook events from CI/CD systems.

## Prerequisites
- Phase 142 — MCP API for Helix Process — External integration foundation
- Phase 144 — GitHub Integration — GitHub ecosystem familiarity

## Epic Context
**Epic:** 18 — MCP & External Agent Integration
**Phase:** 145 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
CI/CD pipelines run during Helix phases: tests run, builds compile, deployments execute. Currently, this activity is siloed in separate systems. By integrating CI/CD webhooks, Foundry automatically captures pipeline status, test results, deployment outcomes, and links them to phases.

A phase's status reflects the real pipeline health: "Phase 42: Testing" stays pending until all tests pass, shows failure if tests fail, marks complete when deployment succeeds.

---

## Detailed Requirements

### 1. CI/CD Event Processing Service
#### File: `lib/integrations/cicdEvents.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface CICDWorkflow {
  id: string;
  name: string;
  status: 'success' | 'failure' | 'in_progress' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  conclusion?: string;
}

export interface PipelineStatus {
  workflowId: string;
  status: 'success' | 'failure' | 'in_progress' | 'cancelled';
  tests?: {
    passed: number;
    failed: number;
    skipped: number;
  };
  coverage?: number;
  artifacts?: string[];
  logs?: string;
}

export async function processCICDWebhook(
  event: any,
  projectId: string,
  source: 'github-actions' | 'vercel',
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  if (source === 'github-actions') {
    await processGitHubActionsEvent(event, projectId, supabaseClient);
  } else if (source === 'vercel') {
    await processVercelEvent(event, projectId, supabaseClient);
  }
}

async function processGitHubActionsEvent(
  event: any,
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const workflow = event.workflow_run;
  const status = workflow.status === 'completed' ? workflow.conclusion : 'in_progress';

  const { error: insertError } = await supabaseClient
    .from('helix_cicd_events')
    .insert([
      {
        project_id: projectId,
        pipeline_source: 'github-actions',
        workflow_id: workflow.id.toString(),
        workflow_name: workflow.name,
        status,
        started_at: new Date(workflow.created_at).toISOString(),
        completed_at: workflow.updated_at ? new Date(workflow.updated_at).toISOString() : null,
        branch: workflow.head_branch,
        commit_sha: workflow.head_commit?.id,
        artifacts: workflow.artifacts?.map((a: any) => a.name) || [],
        raw_payload: event,
      },
    ]);

  if (insertError) {
    console.error('Failed to store GitHub Actions event:', insertError);
    return;
  }

  // Auto-update phase status if workflow succeeded
  if (status === 'success') {
    // Try to find associated phase by branch or commit
    const { data: phases } = await supabaseClient
      .from('helix_build_phases')
      .select('id, phase_number')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: false })
      .limit(1);

    if (phases && phases.length > 0) {
      const phase = phases[0];
      await supabaseClient
        .from('helix_build_phases')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', phase.id);
    }
  }
}

async function processVercelEvent(
  event: any,
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const deployment = event.deployment;

  const { error } = await supabaseClient
    .from('helix_cicd_events')
    .insert([
      {
        project_id: projectId,
        pipeline_source: 'vercel',
        workflow_id: deployment.id,
        workflow_name: `Vercel Deployment ${deployment.environment}`,
        status: deployment.state === 'READY' ? 'success' : deployment.state === 'ERROR' ? 'failure' : 'in_progress',
        started_at: new Date(deployment.createdAt).toISOString(),
        completed_at: deployment.readyAt ? new Date(deployment.readyAt).toISOString() : null,
        branch: deployment.gitSource?.ref,
        commit_sha: deployment.gitSource?.sha,
        environment: deployment.environment,
        deployment_url: deployment.url,
        raw_payload: event,
      },
    ]);

  if (error) {
    console.error('Failed to store Vercel event:', error);
  }
}

export async function getPipelineStatusForPhase(
  projectId: string,
  phaseNumber: number,
  supabaseClient: ReturnType<typeof createClient>
): Promise<any> {
  // Get most recent CICD events for the project
  const { data: events } = await supabaseClient
    .from('helix_cicd_events')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!events || events.length === 0) {
    return { status: 'unknown', events: [] };
  }

  // Get phase details for timing context
  const { data: phase } = await supabaseClient
    .from('helix_build_phases')
    .select('started_at, completed_at')
    .eq('project_id', projectId)
    .eq('phase_number', phaseNumber)
    .single();

  if (!phase) {
    return { status: 'unknown', events };
  }

  // Filter events that occurred during this phase
  const phaseEvents = events.filter((e: any) => {
    const eventTime = new Date(e.started_at).getTime();
    const phaseStart = new Date(phase.started_at).getTime();
    const phaseEnd = phase.completed_at ? new Date(phase.completed_at).getTime() : Date.now();
    return eventTime >= phaseStart && eventTime <= phaseEnd;
  });

  return {
    status: phaseEvents.length > 0 ? phaseEvents[0].status : 'unknown',
    events: phaseEvents,
  };
}

export async function getLatestPipelineStatus(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<PipelineStatus | null> {
  const { data: event } = await supabaseClient
    .from('helix_cicd_events')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!event) return null;

  return {
    workflowId: event.workflow_id,
    status: event.status,
    artifacts: event.artifacts || [],
    logs: event.raw_payload?.logs_url,
  };
}
```

### 2. CI/CD Events Database Schema
#### File: `migrations/add_helix_cicd_events.sql` (NEW)
```sql
CREATE TABLE IF NOT EXISTS helix_cicd_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pipeline_source TEXT NOT NULL, -- github-actions, vercel, etc
  workflow_id TEXT NOT NULL,
  workflow_name TEXT,
  status TEXT NOT NULL, -- success, failure, in_progress, cancelled
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  branch TEXT,
  commit_sha TEXT,
  environment TEXT, -- production, staging, preview
  deployment_url TEXT,
  artifacts TEXT[] DEFAULT ARRAY[]::TEXT[],
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('success', 'failure', 'in_progress', 'cancelled'))
);

CREATE INDEX idx_cicd_project ON helix_cicd_events(project_id);
CREATE INDEX idx_cicd_status ON helix_cicd_events(status);
CREATE INDEX idx_cicd_source ON helix_cicd_events(pipeline_source);
CREATE INDEX idx_cicd_created ON helix_cicd_events(created_at);

ALTER TABLE helix_cicd_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org cicd events"
  ON helix_cicd_events FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );
```

### 3. CI/CD Webhook Handlers
#### File: `app/api/v1/webhooks/github-actions/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processCICDWebhook } from '@/lib/integrations/cicdEvents';
import crypto from 'crypto';

function verifyGitHubSignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  const expected = `sha256=${hash}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-hub-signature-256') || '';

    if (!verifyGitHubSignature(payload, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(payload);
    const supabase = createClient();

    const repoUrl = event.repository?.full_name;
    if (!repoUrl) {
      return NextResponse.json({ error: 'No repo info' }, { status: 400 });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('github_repo', repoUrl)
      .single();

    if (!project) {
      return NextResponse.json({ message: 'Project not tracked' }, { status: 200 });
    }

    await processCICDWebhook(event, project.id, 'github-actions', supabase);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('GitHub Actions webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### File: `app/api/v1/webhooks/vercel/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processCICDWebhook } from '@/lib/integrations/cicdEvents';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    const supabase = createClient();

    const projectName = event.projectId;
    if (!projectName) {
      return NextResponse.json({ error: 'No project info' }, { status: 400 });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('vercel_project_id', projectName)
      .single();

    if (!project) {
      return NextResponse.json({ message: 'Project not tracked' }, { status: 200 });
    }

    await processCICDWebhook(event, project.id, 'vercel', supabase);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vercel webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 4. Pipeline Status Component
#### File: `components/helix/phases/PipelineStatus.tsx` (NEW)
```typescript
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface PipelineStatusProps {
  projectId: string;
  phaseNumber?: number;
}

export function PipelineStatus({ projectId, phaseNumber }: PipelineStatusProps) {
  const supabase = createClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['pipeline-status', projectId, phaseNumber],
    queryFn: async () => {
      const endpoint = phaseNumber
        ? `/api/v1/helix/phases/${projectId}/${phaseNumber}/pipeline-status`
        : `/api/v1/helix/projects/${projectId}/latest-pipeline-status`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
    refetchInterval: 30000, // Poll every 30s
  });

  if (isLoading) {
    return <div className="animate-pulse h-16 bg-gray-200 rounded"></div>;
  }

  if (!status || status.status === 'unknown') {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600 text-sm">
        No pipeline data available
      </div>
    );
  }

  const getStatusColor = (s: string) => {
    if (s === 'success') return 'bg-green-100 text-green-700 border-green-300';
    if (s === 'failure') return 'bg-red-100 text-red-700 border-red-300';
    if (s === 'in_progress') return 'bg-blue-100 text-blue-700 border-blue-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getStatusIcon = (s: string) => {
    if (s === 'success') return '✓';
    if (s === 'failure') return '✕';
    if (s === 'in_progress') return '→';
    return '?';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pipeline Status</h3>

      <div className={`rounded-lg border p-4 ${getStatusColor(status.status)}`}>
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-2xl">{getStatusIcon(status.status)}</span>
          <span className="font-semibold capitalize">{status.status}</span>
        </div>
        {status.events && status.events.length > 0 && (
          <div className="text-sm space-y-1 mt-3 border-t border-current border-opacity-20 pt-3">
            {status.events.map((event: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span>{event.workflow_name}</span>
                <span className="opacity-75">
                  {new Date(event.started_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {status.artifacts && status.artifacts.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-semibold mb-2">Artifacts</p>
          <ul className="text-sm space-y-1">
            {status.artifacts.map((artifact: string, idx: number) => (
              <li key={idx} className="text-blue-700">
                • {artifact}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### 5. Pipeline Status API Endpoints
#### File: `app/api/v1/helix/phases/[projectId]/[phaseNumber]/pipeline-status/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPipelineStatusForPhase } from '@/lib/integrations/cicdEvents';
import { verifyApiKey } from '@/lib/auth/apiKeys';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; phaseNumber: string } }
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
    const status = await getPipelineStatusForPhase(
      params.projectId,
      parseInt(params.phaseNumber, 10),
      supabase
    );

    return NextResponse.json({
      projectId: params.projectId,
      phaseNumber: params.phaseNumber,
      ...status,
    });
  } catch (error) {
    console.error('Pipeline status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
migrations/
└── add_helix_cicd_events.sql (NEW)
lib/
└── integrations/
    └── cicdEvents.ts (NEW)
components/
└── helix/
    └── phases/
        └── PipelineStatus.tsx (NEW)
app/
└── api/
    └── v1/
        ├── webhooks/
        │   ├── github-actions/
        │   │   └── route.ts (NEW)
        │   └── vercel/
        │       └── route.ts (NEW)
        └── helix/
            └── phases/
                └── [projectId]/
                    └── [phaseNumber]/
                        └── pipeline-status/
                            └── route.ts (NEW)
```

---

## Dependencies
- crypto: Node.js built-in
- Supabase: existing
- @tanstack/react-query: ^5.28.0

---

## Tech Stack for This Phase
- Next.js 16+ (API routes, Server Components)
- TypeScript
- Supabase (event storage and RLS)
- GitHub Actions Webhooks
- Vercel Webhooks
- React (UI components)
- TailwindCSS v4 (styling)

---

## Acceptance Criteria
1. GitHub Actions webhook endpoint receives workflow_run events
2. Vercel webhook endpoint receives deployment events
3. CI/CD events stored in helix_cicd_events table
4. Event status correctly mapped (success/failure/in_progress)
5. Phase auto-updated to 'completed' when pipeline succeeds
6. Pipeline status component displays current workflow status
7. Multiple events from same phase grouped in timeline
8. Artifacts from CI/CD linked and accessible
9. API endpoint returns pipeline status for specific phase
10. Latest pipeline status accessible via project-level endpoint

---

## Testing Instructions
1. Configure GitHub Actions workflow with webhook to /api/v1/webhooks/github-actions
2. Configure Vercel deployment with webhook to /api/v1/webhooks/vercel
3. Trigger GitHub Actions workflow, verify event stored in helix_cicd_events
4. Verify status correctly mapped to 'in_progress' then 'success'
5. Verify phase status auto-updated to 'completed'
6. Trigger Vercel deployment, verify event stored
7. View phase detail, verify pipeline status component shows workflow
8. Call API endpoint, verify pipeline status returned
9. Verify artifact list populated from CI/CD
10. Test webhook with invalid signature, verify rejection

---

## Notes for the AI Agent
- CRITICAL: Set GITHUB_WEBHOOK_SECRET for GitHub Actions signature verification
- Vercel webhooks don't require signature verification (IP-based in production)
- Consider adding Slack/email notifications when pipeline fails
- Future enhancement: GitLab and CircleCI webhook support
- Consider caching latest pipeline status for quick dashboard loads
