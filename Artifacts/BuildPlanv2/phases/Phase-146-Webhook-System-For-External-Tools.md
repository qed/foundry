# Phase 146 — Webhook System for External Tools

## Objective
Build a configurable outbound webhook system for Helix events (phase_completed, stage_gate_passed, deployment_triggered, bug_found) with management UI, testing capabilities, delivery logs, and retry logic.

## Prerequisites
- Phase 142 — MCP API for Helix Process — Event infrastructure
- Phase 145 — CI/CD Pipeline Integration — External tool patterns

## Epic Context
**Epic:** 18 — MCP & External Agent Integration
**Phase:** 146 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
External systems (monitoring, incident management, Slack, custom tools) need to react to Helix events in real-time. Rather than hard-coding integrations for each tool, a generic webhook system allows teams to configure any external endpoint and subscribe to events of interest.

Teams can send "phase completed" events to custom aggregation systems, send "deployment triggered" to monitoring systems, send "bug found" to issue trackers. Delivery logs and retry logic ensure reliability.

---

## Detailed Requirements

### 1. Webhook Configuration Service
#### File: `lib/webhooks/webhookManager.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface WebhookConfig {
  id?: string;
  projectId: string;
  url: string;
  events: string[]; // phase_completed, stage_gate_passed, deployment_triggered, bug_found
  active: boolean;
  retryAttempts?: number;
  retryDelaySeconds?: number;
  customHeaders?: Record<string, string>;
  createdAt?: Date;
}

export interface WebhookEvent {
  id?: string;
  webhookId: string;
  eventType: string;
  payload: any;
  status: 'pending' | 'success' | 'failure';
  attempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  responseStatus?: number;
  responseBody?: string;
}

export async function createWebhook(
  config: WebhookConfig,
  supabaseClient: ReturnType<typeof createClient>
): Promise<string> {
  const { data, error } = await supabaseClient
    .from('helix_webhooks')
    .insert([
      {
        project_id: config.projectId,
        url: config.url,
        events: config.events,
        active: config.active !== false,
        retry_attempts: config.retryAttempts || 3,
        retry_delay_seconds: config.retryDelaySeconds || 60,
        custom_headers: config.customHeaders || {},
      },
    ])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getProjectWebhooks(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<WebhookConfig[]> {
  const { data, error } = await supabaseClient
    .from('helix_webhooks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateWebhook(
  webhookId: string,
  config: Partial<WebhookConfig>,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const { error } = await supabaseClient
    .from('helix_webhooks')
    .update({
      url: config.url,
      events: config.events,
      active: config.active,
      retry_attempts: config.retryAttempts,
      retry_delay_seconds: config.retryDelaySeconds,
      custom_headers: config.customHeaders,
    })
    .eq('id', webhookId);

  if (error) throw error;
}

export async function deleteWebhook(
  webhookId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const { error } = await supabaseClient
    .from('helix_webhooks')
    .delete()
    .eq('id', webhookId);

  if (error) throw error;
}

export async function triggerWebhooks(
  projectId: string,
  eventType: string,
  payload: any,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  // Get all active webhooks for this project that listen to this event
  const { data: webhooks, error: queryError } = await supabaseClient
    .from('helix_webhooks')
    .select('*')
    .eq('project_id', projectId)
    .eq('active', true);

  if (queryError) {
    console.error('Failed to fetch webhooks:', queryError);
    return;
  }

  for (const webhook of webhooks || []) {
    if (!webhook.events.includes(eventType)) continue;

    // Queue webhook delivery
    await supabaseClient
      .from('helix_webhook_events')
      .insert([
        {
          webhook_id: webhook.id,
          event_type: eventType,
          payload,
          status: 'pending',
          attempts: 0,
        },
      ]);
  }
}

export async function getWebhookDeliveryLog(
  webhookId: string,
  limit: number = 50,
  supabaseClient: ReturnType<typeof createClient>
): Promise<any[]> {
  const { data, error } = await supabaseClient
    .from('helix_webhook_events')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function testWebhook(
  webhookId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<any> {
  const { data: webhook } = await supabaseClient
    .from('helix_webhooks')
    .select('*')
    .eq('id', webhookId)
    .single();

  if (!webhook) throw new Error('Webhook not found');

  const testPayload = {
    test: true,
    timestamp: new Date().toISOString(),
    eventType: 'test',
  };

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Helix-Event': 'test',
        'X-Helix-Signature': 'test',
        ...webhook.custom_headers,
      },
      body: JSON.stringify(testPayload),
    });

    return {
      success: response.ok,
      status: response.status,
      message: response.statusText,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
```

### 2. Webhook Schema
#### File: `migrations/add_helix_webhooks.sql` (NEW)
```sql
CREATE TABLE IF NOT EXISTS helix_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- phase_completed, stage_gate_passed, deployment_triggered, bug_found
  active BOOLEAN DEFAULT TRUE,
  retry_attempts INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  custom_headers JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS helix_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES helix_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, success, failure
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'success', 'failure'))
);

CREATE INDEX idx_webhooks_project ON helix_webhooks(project_id);
CREATE INDEX idx_webhook_events_status ON helix_webhook_events(status);
CREATE INDEX idx_webhook_events_webhook ON helix_webhook_events(webhook_id);

ALTER TABLE helix_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage org webhooks"
  ON helix_webhooks FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );
```

### 3. Webhook Management Component
#### File: `components/helix/webhooks/WebhookManager.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface WebhookManagerProps {
  projectId: string;
}

const WEBHOOK_EVENTS = [
  { id: 'phase_completed', label: 'Phase Completed' },
  { id: 'stage_gate_passed', label: 'Stage Gate Passed' },
  { id: 'deployment_triggered', label: 'Deployment Triggered' },
  { id: 'bug_found', label: 'Bug Found' },
];

export function WebhookManager({ projectId }: WebhookManagerProps) {
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ url: '', events: [] });
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);

  const { data: webhooks, refetch } = useQuery({
    queryKey: ['webhooks', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/helix/projects/${projectId}/webhooks`);
      if (!response.ok) throw new Error('Failed to fetch webhooks');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/helix/projects/${projectId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to create webhook');
      return response.json();
    },
    onSuccess: () => {
      setShowForm(false);
      setFormData({ url: '', events: [] });
      refetch();
    },
  });

  const testMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const response = await fetch(
        `/api/v1/helix/projects/${projectId}/webhooks/${webhookId}/test`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Test failed');
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const response = await fetch(
        `/api/v1/helix/projects/${projectId}/webhooks/${webhookId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      setSelectedWebhookId(null);
      refetch();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Webhooks</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Add Webhook'}
        </button>
      </div>

      {/* Add Webhook Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Webhook URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com/helix-webhook"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subscribe to Events</label>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          events: [...formData.events, event.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          events: formData.events.filter((ev) => ev !== event.id),
                        });
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{event.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={!formData.url || formData.events.length === 0}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            Create Webhook
          </button>
        </div>
      )}

      {/* Webhooks List */}
      <div className="space-y-3">
        {webhooks?.webhooks?.map((webhook: any) => (
          <div key={webhook.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{webhook.url}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {webhook.events.map((e: string) => (
                    <span
                      key={e}
                      className="inline-block mr-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      {e}
                    </span>
                  ))}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => testMutation.mutate(webhook.id)}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Test
                </button>
                <button
                  onClick={() => setSelectedWebhookId(webhook.id)}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  View Log
                </button>
                <button
                  onClick={() => deleteMutation.mutate(webhook.id)}
                  className="px-3 py-1 text-sm bg-red-200 text-red-700 rounded hover:bg-red-300"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Test Result */}
            {testMutation.data && testMutation.data.webhookId === webhook.id && (
              <div className={`mt-3 p-2 rounded text-sm ${
                testMutation.data.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {testMutation.data.success
                  ? `Test successful (${testMutation.data.status})`
                  : `Test failed: ${testMutation.data.error}`}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delivery Log */}
      {selectedWebhookId && (
        <DeliveryLog projectId={projectId} webhookId={selectedWebhookId} />
      )}
    </div>
  );
}

function DeliveryLog({ projectId, webhookId }: { projectId: string; webhookId: string }) {
  const { data: events } = useQuery({
    queryKey: ['webhook-log', webhookId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/helix/projects/${projectId}/webhooks/${webhookId}/log`
      );
      if (!response.ok) throw new Error('Failed to fetch log');
      return response.json();
    },
  });

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h3 className="text-lg font-semibold">Delivery Log</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events?.events?.map((event: any) => (
          <div key={event.id} className="border rounded p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{event.event_type}</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                event.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {event.status}
              </span>
            </div>
            {event.response_status && (
              <p className="text-gray-600 mt-1">HTTP {event.response_status}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              {new Date(event.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. Webhook API Endpoints
#### File: `app/api/v1/helix/projects/[projectId]/webhooks/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createWebhook, getProjectWebhooks } from '@/lib/webhooks/webhookManager';
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
    const webhooks = await getProjectWebhooks(params.projectId, supabase);

    return NextResponse.json({
      projectId: params.projectId,
      webhooks,
      count: webhooks.length,
    });
  } catch (error) {
    console.error('Get webhooks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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

    const body = await request.json();
    const supabase = createClient();
    const webhookId = await createWebhook({
      projectId: params.projectId,
      url: body.url,
      events: body.events,
      active: body.active !== false,
      retryAttempts: body.retryAttempts,
      retryDelaySeconds: body.retryDelaySeconds,
      customHeaders: body.customHeaders,
    }, supabase);

    return NextResponse.json({ webhookId }, { status: 201 });
  } catch (error) {
    console.error('Create webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
migrations/
└── add_helix_webhooks.sql (NEW)
lib/
└── webhooks/
    └── webhookManager.ts (NEW)
components/
└── helix/
    └── webhooks/
        └── WebhookManager.tsx (NEW)
app/
└── api/
    └── v1/
        └── helix/
            └── projects/
                └── [projectId]/
                    └── webhooks/
                        ├── route.ts (NEW)
                        └── [webhookId]/
                            ├── test/
                            │   └── route.ts (NEW)
                            └── log/
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
- Supabase (webhook storage and RLS)
- React (UI components)
- TailwindCSS v4

---

## Acceptance Criteria
1. Webhook configuration form allows URL and event selection
2. Multiple webhooks can be created per project
3. Each webhook independently subscribes to selected events
4. Webhook delivery queued in helix_webhook_events on event trigger
5. Test webhook button sends test payload and shows result
6. Delivery log displays all webhook deliveries with status
7. Retry logic attempts failed deliveries up to retry_attempts
8. Custom headers configurable and sent with each webhook call
9. API endpoints support GET (list), POST (create), DELETE (remove)
10. All webhook data protected by RLS policies

---

## Testing Instructions
1. Create webhook with URL and subscribe to 2+ events
2. Verify webhook created in database
3. Click test button, verify test payload sent
4. Trigger phase_completed event, verify webhook queued
5. Verify delivery log shows pending event
6. Simulate successful webhook delivery
7. Verify delivery log shows success status
8. Simulate failed delivery
9. Verify retry logic queues next attempt
10. Delete webhook, verify no longer receives events

---

## Notes for the AI Agent
- Webhook delivery job processor runs as background task
- Consider adding exponential backoff for retries
- Add rate limiting to prevent webhook spam
- Future enhancement: webhook templates for common tools (Slack, Discord)
- Consider adding webhook signing for security
