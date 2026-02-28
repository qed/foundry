# Phase 142 — MCP API for Helix Process

## Objective
Build a comprehensive RESTful API for Helix process state management using existing v1 MCP patterns, providing endpoints for process status, step evidence, build plans, and metrics with authentication and rate limiting.

## Prerequisites
- Phase 135 — Core Helix Process Engine — Helix data structures
- Phase 136 — Process Metrics Dashboard — Metrics infrastructure

## Epic Context
**Epic:** 18 — MCP & External Agent Integration
**Phase:** 142 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
External agents (Claude Code, GitHub Actions, CI/CD systems) need programmatic access to Helix process state. This MCP API provides a standardized interface for agents to query process status, retrieve evidence, access build plans, and fetch metrics. The API follows existing v1 patterns (app_key authentication, standard request/response format) for consistency.

This phase establishes the foundation for external integrations in phases 143-148. The API must be well-documented via OpenAPI, properly authenticated, rate-limited, and versioned for future extensibility.

---

## Detailed Requirements

### 1. MCP API Routes and Handlers
#### File: `app/api/v1/helix/process/[projectId]/status/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiKey } from '@/lib/auth/apiKeys';
import { rateLimitCheck } from '@/lib/middleware/rateLimit';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // Rate limit check
    const rateLimitKey = request.headers.get('authorization')?.split(' ')[1] || '';
    const { allowed, remaining } = await rateLimitCheck(rateLimitKey, 'helix-api');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
      );
    }

    // API key verification
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const verified = await verifyApiKey(apiKey);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const supabase = createClient();

    // Get process status
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('id', params.projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get current phase
    const { data: currentPhase } = await supabase
      .from('helix_build_phases')
      .select('*')
      .eq('project_id', params.projectId)
      .order('phase_number', { ascending: false })
      .limit(1)
      .single();

    // Get all phases summary
    const { data: allPhases } = await supabase
      .from('helix_build_phases')
      .select('status')
      .eq('project_id', params.projectId);

    const phaseStats = {
      total: allPhases?.length || 0,
      completed: allPhases?.filter(p => p.status === 'completed').length || 0,
      inProgress: allPhases?.filter(p => p.status === 'in_progress').length || 0,
      pending: allPhases?.filter(p => p.status === 'pending').length || 0,
      failed: allPhases?.filter(p => p.status === 'failed').length || 0,
    };

    return NextResponse.json({
      projectId: params.projectId,
      projectName: project.name,
      status: project.status,
      currentPhase: currentPhase ? {
        number: currentPhase.phase_number,
        title: currentPhase.title,
        status: currentPhase.status,
        startedAt: currentPhase.started_at,
      } : null,
      phases: phaseStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Helix status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### File: `app/api/v1/helix/process/[projectId]/steps/[stepId]/evidence/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiKey } from '@/lib/auth/apiKeys';
import { rateLimitCheck } from '@/lib/middleware/rateLimit';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; stepId: string } }
) {
  try {
    const rateLimitKey = request.headers.get('authorization')?.split(' ')[1] || '';
    const { allowed, remaining } = await rateLimitCheck(rateLimitKey, 'helix-api');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
      );
    }

    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const verified = await verifyApiKey(apiKey);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const supabase = createClient();

    // Get step evidence
    const { data: evidence, error } = await supabase
      .from('helix_step_evidence')
      .select('*')
      .eq('project_id', params.projectId)
      .eq('step_id', params.stepId);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch evidence' }, { status: 500 });
    }

    return NextResponse.json({
      projectId: params.projectId,
      stepId: params.stepId,
      evidence: evidence || [],
      count: evidence?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Evidence API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; stepId: string } }
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

    // Submit evidence
    const { data, error } = await supabase
      .from('helix_step_evidence')
      .insert([
        {
          project_id: params.projectId,
          step_id: params.stepId,
          evidence_type: body.type,
          content: body.content,
          source: body.source || 'api',
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to submit evidence' }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Submit evidence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### File: `app/api/v1/helix/process/[projectId]/buildplan/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiKey } from '@/lib/auth/apiKeys';
import { rateLimitCheck } from '@/lib/middleware/rateLimit';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const rateLimitKey = request.headers.get('authorization')?.split(' ')[1] || '';
    const { allowed, remaining } = await rateLimitCheck(rateLimitKey, 'helix-api');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
      );
    }

    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const verified = await verifyApiKey(apiKey);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const supabase = createClient();

    // Get build plan (complete Helix specification)
    const { data: phases } = await supabase
      .from('helix_build_phases')
      .select(`
        phase_number,
        title,
        description,
        status,
        requirements,
        acceptance_criteria,
        estimated_hours,
        started_at,
        completed_at
      `)
      .eq('project_id', params.projectId)
      .order('phase_number', { ascending: true });

    return NextResponse.json({
      projectId: params.projectId,
      buildPlan: phases || [],
      totalPhases: phases?.length || 0,
      completedPhases: phases?.filter(p => p.status === 'completed').length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Build plan API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### File: `app/api/v1/helix/process/[projectId]/metrics/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiKey } from '@/lib/auth/apiKeys';
import { rateLimitCheck } from '@/lib/middleware/rateLimit';
import { calculateProcessHealth } from '@/lib/metrics/processMetrics';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const rateLimitKey = request.headers.get('authorization')?.split(' ')[1] || '';
    const { allowed, remaining } = await rateLimitCheck(rateLimitKey, 'helix-api');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
      );
    }

    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const verified = await verifyApiKey(apiKey);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const supabase = createClient();
    const health = await calculateProcessHealth(params.projectId, supabase);

    const { data: phases } = await supabase
      .from('helix_build_phases')
      .select('duration_minutes')
      .eq('project_id', params.projectId)
      .eq('status', 'completed');

    const totalDuration = phases?.reduce((sum, p) => sum + (p.duration_minutes || 0), 0) || 0;

    return NextResponse.json({
      projectId: params.projectId,
      health,
      totalDuration,
      averagePhaseTime: phases && phases.length > 0 ? totalDuration / phases.length : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 2. Rate Limiting Middleware
#### File: `lib/middleware/rateLimit.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

const RATE_LIMITS = {
  'helix-api': { requests: 1000, window: 3600 }, // 1000 requests per hour
  'default': { requests: 100, window: 3600 },
};

export async function rateLimitCheck(
  apiKey: string,
  category: keyof typeof RATE_LIMITS = 'default'
): Promise<{ allowed: boolean; remaining: number }> {
  if (!apiKey) return { allowed: false, remaining: 0 };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const limit = RATE_LIMITS[category];
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - limit.window;

  // Get request count from this time window
  const { data: requests, error } = await supabase
    .from('api_rate_limit_log')
    .select('id')
    .eq('api_key', apiKey)
    .eq('category', category)
    .gte('timestamp', windowStart);

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: limit.requests }; // Fail open
  }

  const requestCount = requests?.length || 0;
  const allowed = requestCount < limit.requests;
  const remaining = Math.max(0, limit.requests - requestCount);

  // Log this request
  if (allowed) {
    await supabase.from('api_rate_limit_log').insert([
      {
        api_key: apiKey,
        category,
        timestamp: now,
      },
    ]);
  }

  return { allowed, remaining };
}
```

### 3. OpenAPI Documentation
#### File: `public/api/helix-v1.openapi.json` (NEW)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Foundry v2 Helix MCP API",
    "version": "1.0.0",
    "description": "Process state management API for Helix Mode external integrations"
  },
  "servers": [
    {
      "url": "https://foundry.dev/api/v1",
      "description": "Production"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/helix/process/{projectId}/status": {
      "get": {
        "summary": "Get process status",
        "parameters": [
          {
            "name": "projectId",
            "in": "path",
            "required": true,
            "schema": { "type": "string", "format": "uuid" }
          }
        ],
        "responses": {
          "200": {
            "description": "Process status",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "projectId": { "type": "string" },
                    "projectName": { "type": "string" },
                    "status": { "type": "string" },
                    "currentPhase": {
                      "type": "object",
                      "properties": {
                        "number": { "type": "integer" },
                        "title": { "type": "string" },
                        "status": { "type": "string" },
                        "startedAt": { "type": "string", "format": "date-time" }
                      }
                    },
                    "phases": {
                      "type": "object",
                      "properties": {
                        "total": { "type": "integer" },
                        "completed": { "type": "integer" },
                        "inProgress": { "type": "integer" },
                        "pending": { "type": "integer" }
                      }
                    },
                    "timestamp": { "type": "string", "format": "date-time" }
                  }
                }
              }
            }
          },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Project not found" }
        }
      }
    },
    "/helix/process/{projectId}/steps/{stepId}/evidence": {
      "get": {
        "summary": "Get step evidence",
        "parameters": [
          {
            "name": "projectId",
            "in": "path",
            "required": true,
            "schema": { "type": "string", "format": "uuid" }
          },
          {
            "name": "stepId",
            "in": "path",
            "required": true,
            "schema": { "type": "string", "format": "uuid" }
          }
        ],
        "responses": {
          "200": {
            "description": "Step evidence",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "evidence": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": { "type": "string" },
                          "type": { "type": "string" },
                          "content": { "type": "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Submit step evidence",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["type", "content"],
                "properties": {
                  "type": { "type": "string", "enum": ["text", "file", "url", "checklist"] },
                  "content": { "type": "string" },
                  "source": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Evidence submitted" }
        }
      }
    },
    "/helix/process/{projectId}/buildplan": {
      "get": {
        "summary": "Get build plan",
        "parameters": [
          {
            "name": "projectId",
            "in": "path",
            "required": true,
            "schema": { "type": "string", "format": "uuid" }
          }
        ],
        "responses": {
          "200": {
            "description": "Build plan with all phases"
          }
        }
      }
    },
    "/helix/process/{projectId}/metrics": {
      "get": {
        "summary": "Get process metrics",
        "parameters": [
          {
            "name": "projectId",
            "in": "path",
            "required": true,
            "schema": { "type": "string", "format": "uuid" }
          }
        ],
        "responses": {
          "200": {
            "description": "Process metrics including health score"
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "uuid"
      }
    }
  }
}
```

---

## File Structure
```
app/
└── api/
    └── v1/
        └── helix/
            └── process/
                └── [projectId]/
                    ├── status/
                    │   └── route.ts (NEW)
                    ├── steps/
                    │   └── [stepId]/
                    │       └── evidence/
                    │           └── route.ts (NEW)
                    ├── buildplan/
                    │   └── route.ts (NEW)
                    └── metrics/
                        └── route.ts (NEW)
lib/
└── middleware/
    └── rateLimit.ts (NEW)
public/
└── api/
    └── helix-v1.openapi.json (NEW)
```

---

## Dependencies
- Supabase: existing
- Next.js 16+: existing

---

## Tech Stack for This Phase
- Next.js 16+ (API routes)
- TypeScript
- Supabase (data access)
- Standard HTTP/REST

---

## Acceptance Criteria
1. Status endpoint returns project status, current phase, and phase statistics
2. Evidence endpoint GET returns all evidence for a step
3. Evidence endpoint POST submits new evidence
4. Build plan endpoint returns all phases with requirements and criteria
5. Metrics endpoint returns health score and duration metrics
6. All endpoints require valid API key authentication
7. Rate limiting enforced at 1000 requests/hour per API key
8. OpenAPI documentation accessible at /api/helix-v1.openapi.json
9. All responses include ISO 8601 timestamp
10. All endpoints return appropriate HTTP status codes (401, 404, 429)

---

## Testing Instructions
1. Create API key with org access
2. Call GET /helix/process/:id/status with valid key, verify response
3. Call without authorization header, verify 401
4. Call with invalid API key, verify 401
5. Call 1001 times in 1 hour, verify 429 on 1001st call
6. Call GET /helix/process/:id/steps/:stepId/evidence, verify array returned
7. Call POST to evidence endpoint with valid data, verify 201 and data stored
8. Call GET /helix/process/:id/buildplan, verify all phases returned
9. Call GET /helix/process/:id/metrics, verify health score and duration included
10. Verify OpenAPI spec accessible and validates against spec

---

## Notes for the AI Agent
- Rate limit log table should be created with migration
- Consider adding caching headers (ETag, Cache-Control) for GET endpoints
- Future enhancement: webhook notifications when phases complete
- Document rate limit resets in X-RateLimit-Reset header
- Consider pagination for large responses (buildplan with 100+ phases)
