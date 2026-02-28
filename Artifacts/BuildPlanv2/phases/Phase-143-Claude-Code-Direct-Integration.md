# Phase 143 — Claude Code Direct Integration

## Objective
Enable triggering of /build-phase commands from within Foundry UI, sending phase specs to Claude Code via MCP API, receiving status updates, and auto-updating Helix process state with real-time build logs displayed.

## Prerequisites
- Phase 142 — MCP API for Helix Process — Foundation for external communication
- Phase 135 — Core Helix Process Engine — Phase specification structure

## Epic Context
**Epic:** 18 — MCP & External Agent Integration
**Phase:** 143 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Developers currently manage the Helix process manually: create phase specs, share with Claude Code, receive artifacts, update status. This phase automates the handoff. From Foundry, a developer can trigger a phase build, which sends the phase spec to Claude Code via its MCP API, monitors progress, displays real-time logs, and updates helix_build_phases status automatically.

This creates a seamless experience: Helix phase tracking and Claude Code execution unified in one interface. Teams can trigger multiple phases in parallel, monitor all builds, and see results in real-time.

---

## Detailed Requirements

### 1. Claude Code Agent Service
#### File: `lib/agents/claudeCodeAgent.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface BuildPhaseRequest {
  projectId: string;
  phaseNumber: number;
  phaseSpec: string; // Full phase markdown specification
  repository?: string; // Git repo URL
  branch?: string; // Branch to work on
}

export interface BuildPhaseStatus {
  phaseId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep?: string;
  logLines: string[];
  estimatedTimeRemaining?: number; // seconds
  artifacts?: string[];
  errors?: string[];
}

export async function triggerClaudeCodeBuild(
  request: BuildPhaseRequest,
  supabaseClient: ReturnType<typeof createClient>
): Promise<string> {
  // Get Claude Code MCP API endpoint from config
  const claudeCodeApiUrl = process.env.CLAUDE_CODE_MCP_URL || 'http://localhost:5173/mcp';

  // Create build request payload
  const payload = {
    command: '/build-phase',
    projectId: request.projectId,
    phaseNumber: request.phaseNumber,
    spec: request.phaseSpec,
    repository: request.repository,
    branch: request.branch,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/helix/callbacks/claude-code`,
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'foundry-helix',
    },
  };

  // Send to Claude Code
  const response = await fetch(`${claudeCodeApiUrl}/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CLAUDE_CODE_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Claude Code API error: ${response.statusText}`);
  }

  const data = await response.json();
  const sessionId = data.sessionId;

  // Store build session reference
  const { error: dbError } = await supabaseClient
    .from('helix_external_builds')
    .insert([
      {
        project_id: request.projectId,
        phase_number: request.phaseNumber,
        external_agent: 'claude-code',
        session_id: sessionId,
        status: 'pending',
        request_payload: payload,
      },
    ]);

  if (dbError) {
    console.error('Failed to store build session:', dbError);
  }

  return sessionId;
}

export async function getClaudeCodeBuildStatus(
  sessionId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<BuildPhaseStatus> {
  // Get session info from database
  const { data: session, error: queryError } = await supabaseClient
    .from('helix_external_builds')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (queryError || !session) {
    throw new Error('Build session not found');
  }

  // Query Claude Code MCP API for status
  const claudeCodeApiUrl = process.env.CLAUDE_CODE_MCP_URL || 'http://localhost:5173/mcp';
  const statusResponse = await fetch(`${claudeCodeApiUrl}/status/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.CLAUDE_CODE_API_KEY}`,
    },
  });

  if (!statusResponse.ok) {
    throw new Error('Failed to get build status');
  }

  const statusData = await statusResponse.json();

  return {
    phaseId: session.id,
    status: statusData.status,
    progress: statusData.progress || 0,
    currentStep: statusData.currentStep,
    logLines: statusData.logs || [],
    estimatedTimeRemaining: statusData.eta,
    artifacts: statusData.artifacts,
    errors: statusData.errors,
  };
}

export async function cancelClaudeCodeBuild(
  sessionId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const claudeCodeApiUrl = process.env.CLAUDE_CODE_MCP_URL || 'http://localhost:5173/mcp';

  const response = await fetch(`${claudeCodeApiUrl}/cancel/${sessionId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLAUDE_CODE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to cancel build');
  }

  // Update database status
  await supabaseClient
    .from('helix_external_builds')
    .update({ status: 'cancelled' })
    .eq('session_id', sessionId);
}

export async function acknowledgeClaudeCodeCompletion(
  sessionId: string,
  status: 'completed' | 'failed',
  artifacts: string[],
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  // Get build session
  const { data: session } = await supabaseClient
    .from('helix_external_builds')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (!session) return;

  // Update phase status in helix_build_phases
  await supabaseClient
    .from('helix_build_phases')
    .update({
      status: status === 'completed' ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      artifacts: artifacts,
    })
    .eq('project_id', session.project_id)
    .eq('phase_number', session.phase_number);

  // Update external build record
  await supabaseClient
    .from('helix_external_builds')
    .update({
      status,
      completed_at: new Date().toISOString(),
      artifacts,
    })
    .eq('session_id', sessionId);
}
```

### 2. Database Schema for Build Sessions
#### File: `migrations/add_helix_external_builds.sql` (NEW)
```sql
CREATE TABLE IF NOT EXISTS helix_external_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  external_agent TEXT NOT NULL, -- 'claude-code', 'github-actions', etc
  session_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed, cancelled
  request_payload JSONB,
  response_payload JSONB,
  artifacts TEXT[] DEFAULT ARRAY[]::TEXT[],
  error_message TEXT,
  started_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_external_builds_project ON helix_external_builds(project_id);
CREATE INDEX idx_external_builds_session ON helix_external_builds(session_id);
CREATE INDEX idx_external_builds_phase ON helix_external_builds(project_id, phase_number);

ALTER TABLE helix_external_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org builds"
  ON helix_external_builds FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );
```

### 3. Trigger Build API Endpoint
#### File: `app/api/v1/helix/phases/trigger-build/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { triggerClaudeCodeBuild } from '@/lib/agents/claudeCodeAgent';
import { verifyApiKey } from '@/lib/auth/apiKeys';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const verified = await verifyApiKey(apiKey);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createClient();

    // Get phase spec from database
    const { data: phase, error: phaseError } = await supabase
      .from('helix_build_phases')
      .select('*')
      .eq('project_id', body.projectId)
      .eq('phase_number', body.phaseNumber)
      .single();

    if (phaseError || !phase) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    // Trigger Claude Code build
    const sessionId = await triggerClaudeCodeBuild(
      {
        projectId: body.projectId,
        phaseNumber: body.phaseNumber,
        phaseSpec: phase.specification,
        repository: body.repository,
        branch: body.branch,
      },
      supabase
    );

    // Update phase status
    await supabase
      .from('helix_build_phases')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', phase.id);

    return NextResponse.json({
      sessionId,
      projectId: body.projectId,
      phaseNumber: body.phaseNumber,
      status: 'pending',
      message: 'Build triggered in Claude Code',
    }, { status: 202 });
  } catch (error) {
    console.error('Trigger build error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 4. Build Status Polling Endpoint
#### File: `app/api/v1/helix/builds/[sessionId]/status/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClaudeCodeBuildStatus } from '@/lib/agents/claudeCodeAgent';
import { verifyApiKey } from '@/lib/auth/apiKeys';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
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
    const status = await getClaudeCodeBuildStatus(params.sessionId, supabase);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Build status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 5. Build Trigger UI Component
#### File: `components/helix/phases/TriggerBuildButton.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { BuildProgressModal } from './BuildProgressModal';

interface TriggerBuildButtonProps {
  projectId: string;
  phaseNumber: number;
  phaseName: string;
}

export function TriggerBuildButton({
  projectId,
  phaseNumber,
  phaseName,
}: TriggerBuildButtonProps) {
  const supabase = createClient();
  const [sessionId, setSessionId] = useState<string | null>(null);

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch('/api/v1/helix/phases/trigger-build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          phaseNumber,
        }),
      });

      if (!response.ok) throw new Error('Failed to trigger build');
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
    },
  });

  if (sessionId) {
    return (
      <BuildProgressModal
        sessionId={sessionId}
        phaseName={phaseName}
        onClose={() => setSessionId(null)}
      />
    );
  }

  return (
    <button
      onClick={() => triggerMutation.mutate()}
      disabled={triggerMutation.isPending}
      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
    >
      {triggerMutation.isPending ? 'Triggering...' : 'Trigger Build in Claude Code'}
    </button>
  );
}
```

### 6. Build Progress Modal
#### File: `components/helix/phases/BuildProgressModal.tsx` (NEW)
```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface BuildProgressModalProps {
  sessionId: string;
  phaseName: string;
  onClose: () => void;
}

export function BuildProgressModal({
  sessionId,
  phaseName,
  onClose,
}: BuildProgressModalProps) {
  const supabase = createClient();
  const [isRefreshing, setIsRefreshing] = useState(true);

  const { data: buildStatus, refetch } = useQuery({
    queryKey: ['build-status', sessionId],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`/api/v1/helix/builds/${sessionId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (buildStatus?.status === 'completed' || buildStatus?.status === 'failed') {
      setIsRefreshing(false);
    }
  }, [buildStatus?.status]);

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'failed') return 'bg-red-100 text-red-700';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Building {phaseName}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(buildStatus?.status || 'pending')}`}>
            {buildStatus?.status || 'pending'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm font-semibold">{buildStatus?.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${buildStatus?.progress || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Current Step */}
        {buildStatus?.currentStep && (
          <div className="p-4 border-b bg-blue-50">
            <p className="text-sm text-gray-600">Current Step</p>
            <p className="font-medium mt-1">{buildStatus.currentStep}</p>
          </div>
        )}

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 font-mono text-sm">
          {buildStatus?.logLines.map((line, idx) => (
            <div key={idx} className="text-gray-700">
              {line}
            </div>
          ))}
        </div>

        {/* Errors */}
        {buildStatus?.errors && buildStatus.errors.length > 0 && (
          <div className="p-4 border-t bg-red-50">
            {buildStatus.errors.map((error, idx) => (
              <p key={idx} className="text-sm text-red-700 mb-1">
                {error}
              </p>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between">
          {buildStatus?.estimatedTimeRemaining && (
            <span className="text-sm text-gray-600">
              ~{Math.round(buildStatus.estimatedTimeRemaining / 60)} min remaining
            </span>
          )}
          <button
            onClick={onClose}
            disabled={isRefreshing && buildStatus?.status === 'in_progress'}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
          >
            {buildStatus?.status === 'in_progress' ? 'Building...' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## File Structure
```
migrations/
└── add_helix_external_builds.sql (NEW)
lib/
└── agents/
    └── claudeCodeAgent.ts (NEW)
components/
└── helix/
    └── phases/
        ├── TriggerBuildButton.tsx (NEW)
        └── BuildProgressModal.tsx (NEW)
app/
└── api/
    └── v1/
        └── helix/
            ├── phases/
            │   └── trigger-build/
            │       └── route.ts (NEW)
            └── builds/
                └── [sessionId]/
                    └── status/
                        └── route.ts (NEW)
```

---

## Dependencies
- @tanstack/react-query: ^5.28.0
- Supabase: existing

---

## Tech Stack for This Phase
- Next.js 16+ (API routes, Server Components)
- TypeScript
- Supabase (session storage and RLS)
- Claude Code MCP API (external integration)
- React (UI components)
- TailwindCSS v4 (styling)

---

## Acceptance Criteria
1. Trigger build button visible on phase detail page
2. Clicking button sends phase spec to Claude Code via MCP API
3. Build session stored in helix_external_builds table
4. Build progress modal displays with real-time log streaming
5. Progress bar updates from 0-100% as build progresses
6. Current step displayed when available
7. Errors displayed in red section if build fails
8. Phase status auto-updated to 'in_progress' when build triggered
9. Phase status auto-updated to 'completed' or 'failed' on build completion
10. Artifacts from Claude Code stored and linked to phase

---

## Testing Instructions
1. Create phase in project
2. Click "Trigger Build in Claude Code" button
3. Verify session created in helix_external_builds
4. Verify modal appears with progress bar at 0%
5. Verify logs display in real-time (mock Claude Code responses)
6. Verify progress bar updates to 50%, 100%
7. Verify current step displays during build
8. Verify phase status changed to 'in_progress'
9. Simulate build completion in mock Claude Code
10. Verify phase status changed to 'completed' and modal shows artifacts

---

## Notes for the AI Agent
- CRITICAL: Requires CLAUDE_CODE_MCP_URL and CLAUDE_CODE_API_KEY environment variables
- Consider adding timeout (e.g., 6 hours) for long-running builds
- Mock Claude Code MCP API for development/testing
- Consider retry logic for failed API calls to Claude Code
- Future enhancement: parallel builds for multiple phases
- Consider WebSocket for real-time log streaming instead of polling
