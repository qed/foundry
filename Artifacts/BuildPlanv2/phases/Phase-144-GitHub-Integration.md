# Phase 144 — GitHub Integration

## Objective
Integrate GitHub webhook handling to auto-track commits per phase (matching commit messages to phase numbers), PRs, branch status, and display GitHub activity timeline per phase.

## Prerequisites
- Phase 142 — MCP API for Helix Process — External integration infrastructure
- Phase 135 — Core Helix Process Engine — Phase structures

## Epic Context
**Epic:** 18 — MCP & External Agent Integration
**Phase:** 144 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
GitHub events are natural touchpoints for the Helix process: commits represent code changes, PRs represent reviews, merges represent integration. By capturing GitHub events via webhooks, Foundry can automatically correlate commits to phases (e.g., commits with message "Phase 42" go to Phase 42), track PR activity, show branch status, and provide a rich activity timeline per phase.

Teams get visibility into "which code changes happened during which phase" without manual entry.

---

## Detailed Requirements

### 1. GitHub Event Processing Service
#### File: `lib/integrations/githubEvents.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  timestamp: Date;
  url: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  author: string;
  state: 'open' | 'closed';
  createdAt: Date;
  mergedAt?: Date;
  url: string;
}

export interface GitHubActivityEvent {
  id: string;
  projectId: string;
  phaseNumber?: number;
  eventType: 'commit' | 'pull_request' | 'push' | 'branch';
  data: any;
  timestamp: Date;
}

export function parsePhaseFromCommitMessage(message: string): number | null {
  // Try to extract phase number from message: "Phase 42: ..." or "[Phase-42]" or "phase 42"
  const patterns = [
    /Phase[\s-](\d+)/i,
    /\[Phase[\s-](\d+)\]/i,
    /phase[\s-](\d+):/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

export async function processGitHubWebhook(
  event: any,
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const eventType = event.X_GITHUB_EVENT;

  if (eventType === 'push') {
    await processPushEvent(event, projectId, supabaseClient);
  } else if (eventType === 'pull_request') {
    await processPullRequestEvent(event, projectId, supabaseClient);
  }
}

async function processPushEvent(
  event: any,
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const commits = event.commits || [];

  for (const commit of commits) {
    const phaseNumber = parsePhaseFromCommitMessage(commit.message);

    const { error } = await supabaseClient
      .from('helix_github_events')
      .insert([
        {
          project_id: projectId,
          phase_number: phaseNumber,
          event_type: 'commit',
          github_event: {
            sha: commit.id,
            message: commit.message,
            author: commit.author?.name || 'Unknown',
            timestamp: new Date(commit.timestamp).toISOString(),
            url: commit.url,
          },
          raw_payload: event,
        },
      ]);

    if (error) {
      console.error('Failed to store commit event:', error);
    }
  }
}

async function processPullRequestEvent(
  event: any,
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const pr = event.pull_request;
  const phaseNumber = parsePhaseFromCommitMessage(pr.title);

  const { error } = await supabaseClient
    .from('helix_github_events')
    .insert([
      {
        project_id: projectId,
        phase_number: phaseNumber,
        event_type: 'pull_request',
        github_event: {
          number: pr.number,
          title: pr.title,
          author: pr.user?.login || 'Unknown',
          state: pr.state,
          createdAt: new Date(pr.created_at).toISOString(),
          mergedAt: pr.merged_at ? new Date(pr.merged_at).toISOString() : null,
          url: pr.html_url,
        },
        raw_payload: event,
      },
    ]);

  if (error) {
    console.error('Failed to store PR event:', error);
  }
}

export async function getPhaseGitHubActivity(
  projectId: string,
  phaseNumber: number,
  supabaseClient: ReturnType<typeof createClient>
): Promise<GitHubActivityEvent[]> {
  const { data, error } = await supabaseClient
    .from('helix_github_events')
    .select('*')
    .eq('project_id', projectId)
    .eq('phase_number', phaseNumber)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch GitHub activity:', error);
    return [];
  }

  return data.map(event => ({
    id: event.id,
    projectId: event.project_id,
    phaseNumber: event.phase_number,
    eventType: event.event_type,
    data: event.github_event,
    timestamp: new Date(event.created_at),
  }));
}

export async function getProjectGitHubStatus(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<any> {
  const { data: events } = await supabaseClient
    .from('helix_github_events')
    .select('event_type')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100);

  const commitCount = events?.filter(e => e.event_type === 'commit').length || 0;
  const prCount = events?.filter(e => e.event_type === 'pull_request').length || 0;

  return {
    totalCommits: commitCount,
    totalPullRequests: prCount,
    lastActivityAt: events?.[0]?.created_at,
  };
}
```

### 2. GitHub Event Database Schema
#### File: `migrations/add_helix_github_events.sql` (NEW)
```sql
CREATE TABLE IF NOT EXISTS helix_github_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_number INTEGER,
  event_type TEXT NOT NULL, -- commit, pull_request, branch, push
  github_event JSONB NOT NULL, -- Structured GitHub data
  raw_payload JSONB, -- Full webhook payload
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT valid_event_type CHECK (event_type IN ('commit', 'pull_request', 'branch', 'push'))
);

CREATE INDEX idx_github_events_project ON helix_github_events(project_id);
CREATE INDEX idx_github_events_phase ON helix_github_events(project_id, phase_number);
CREATE INDEX idx_github_events_type ON helix_github_events(event_type);

ALTER TABLE helix_github_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org github events"
  ON helix_github_events FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );
```

### 3. GitHub Webhook Handler
#### File: `app/api/v1/webhooks/github/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processGitHubWebhook } from '@/lib/integrations/githubEvents';
import crypto from 'crypto';

// Verify GitHub webhook signature
function verifyGitHubSignature(
  payload: string,
  signature: string
): boolean {
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
    const eventType = request.headers.get('x-github-event') || '';

    // Verify webhook signature
    if (!verifyGitHubSignature(payload, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(payload);
    const supabase = createClient();

    // Get project from repository URL
    const repoUrl = event.repository?.full_name;
    if (!repoUrl) {
      return NextResponse.json({ error: 'No repository info' }, { status: 400 });
    }

    // Find project by GitHub repository
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('github_repo', repoUrl)
      .single();

    if (projectError || !project) {
      console.warn(`Project not found for repo: ${repoUrl}`);
      return NextResponse.json({ message: 'Project not tracked' }, { status: 200 });
    }

    // Process webhook
    const processEvent = {
      ...event,
      'X_GITHUB_EVENT': eventType,
    };

    await processGitHubWebhook(processEvent, project.id, supabase);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('GitHub webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 4. GitHub Activity Component
#### File: `components/helix/phases/GitHubActivity.tsx` (NEW)
```typescript
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface GitHubActivityProps {
  projectId: string;
  phaseNumber: number;
}

export function GitHubActivity({ projectId, phaseNumber }: GitHubActivityProps) {
  const supabase = createClient();

  const { data: activity, isLoading } = useQuery({
    queryKey: ['github-activity', projectId, phaseNumber],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/helix/phases/${projectId}/${phaseNumber}/github-activity`
      );
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-200 rounded"></div>;
  }

  if (!activity || activity.events.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-600">
        No GitHub activity for this phase
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">GitHub Activity</h3>

      <div className="space-y-3">
        {activity.events.map((event: any) => (
          <div key={event.id} className="border rounded-lg p-4">
            {event.eventType === 'commit' && (
              <div className="flex items-start space-x-3">
                <div className="mt-1 text-green-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 3.062v6.050a3.066 3.066 0 01-3.062 3.062H5.248a3.066 3.066 0 01-3.062-3.062V6.517a3.066 3.066 0 012.812-3.062zM9 12.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Commit by {event.data.author}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {event.data.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
                <a
                  href={event.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  View
                </a>
              </div>
            )}

            {event.eventType === 'pull_request' && (
              <div className="flex items-start space-x-3">
                <div className={`mt-1 ${event.data.state === 'merged' ? 'text-purple-600' : 'text-blue-600'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    PR #{event.data.number} by {event.data.author}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {event.data.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {event.data.state === 'merged' ? 'Merged' : event.data.state}
                    {' '}
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
                <a
                  href={event.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  View
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-600 text-center pt-2">
        {activity.events.length} event{activity.events.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
```

### 5. GitHub Activity API Endpoint
#### File: `app/api/v1/helix/phases/[projectId]/[phaseNumber]/github-activity/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPhaseGitHubActivity } from '@/lib/integrations/githubEvents';
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
    const events = await getPhaseGitHubActivity(
      params.projectId,
      parseInt(params.phaseNumber, 10),
      supabase
    );

    return NextResponse.json({
      projectId: params.projectId,
      phaseNumber: params.phaseNumber,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('GitHub activity API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
migrations/
└── add_helix_github_events.sql (NEW)
lib/
└── integrations/
    └── githubEvents.ts (NEW)
components/
└── helix/
    └── phases/
        └── GitHubActivity.tsx (NEW)
app/
└── api/
    └── v1/
        ├── webhooks/
        │   └── github/
        │       └── route.ts (NEW)
        └── helix/
            └── phases/
                └── [projectId]/
                    └── [phaseNumber]/
                        └── github-activity/
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
- GitHub Webhooks (event source)
- React (UI components)
- TailwindCSS v4 (styling)

---

## Acceptance Criteria
1. GitHub webhook endpoint receives push and pull_request events
2. Webhook signature verified using GITHUB_WEBHOOK_SECRET
3. Phase number extracted from commit message (Phase 42, [Phase-42], phase 42:)
4. Commits and PRs stored in helix_github_events table
5. Events linked to correct phase when number found in message
6. GitHub activity component displays commits with author and message
7. PRs shown with number, title, and state (open/merged)
8. Activity timeline sorted by most recent first
9. Links to GitHub commits and PRs clickable and functional
10. Empty state displayed when no GitHub activity for phase

---

## Testing Instructions
1. Set up GitHub webhook pointing to /api/v1/webhooks/github
2. Create project with github_repo field set
3. Push commit with message "Phase 42: Added feature"
4. Verify commit stored in helix_github_events with phase_number=42
5. Create PR with title "[Phase 42] Feature PR"
6. Verify PR stored with correct phase number
7. View phase detail, verify GitHub activity component displays commit
8. Verify PR shown in activity timeline
9. Click GitHub links, verify they open correct commit/PR
10. Verify webhook rejects events with invalid signature

---

## Notes for the AI Agent
- CRITICAL: Set GITHUB_WEBHOOK_SECRET environment variable with webhook secret from GitHub settings
- Phase number extraction is regex-based; consider making patterns configurable
- Consider caching GitHub status (last 10 commits, recent PRs) for quick access
- Future enhancement: branch status tracking (main branch protection, CI status)
- Consider adding GitHub commit status checks (GitHub Actions integration)
