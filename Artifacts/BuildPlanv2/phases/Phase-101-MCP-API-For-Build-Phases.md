# Phase 101 — MCP API for Build Phases

## Objective
Build RESTful API endpoints for external agents to query and update build phase status. Enable external systems to integrate with Helix build tracking, retrieve phase specs, update completion status, and attach evidence of completion.

## Prerequisites
- Phase 100 — Build Handoff System — establishes phase completion workflow
- Phase 091 — Build Phase Management Foundation — provides helix_build_phases table

## Epic Context
**Epic:** 11 — Build Phase Management — Step 6.1 Enhancement
**Phase:** 101 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
External tools and agents (Claude Code CLI, CI/CD pipelines, monitoring systems) need to interact with Helix phases programmatically. Currently, all interactions are UI-based. An API allows automation, integration with external systems, and enables the MCP (Model Context Protocol) to fetch phase specs and update status.

This phase builds a versioned API: GET phases list, GET phase details and spec, PATCH phase status, POST phase completion with evidence. API uses application keys for authentication (reuse v1 app_keys system) and implements rate limiting.

---

## Detailed Requirements

### 1. Phase List Endpoint
#### File: `app/api/v1/helix/projects/[projectId]/phases/route.ts` (NEW)
List all phases with status and metadata.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey, getRateLimit } from '@/lib/helix/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  const isValid = await verifyApiKey(apiKey, params.projectId);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
  }

  const rateLimitExceeded = await getRateLimit(apiKey);
  if (rateLimitExceeded) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, completed, pending, in_progress
    const epic = searchParams.get('epic');

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

    let query = supabase
      .from('helix_build_phases')
      .select('*')
      .eq('project_id', params.projectId);

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    if (epic) {
      query = query.eq('epic', parseInt(epic));
    }

    const { data: phases, error } = await query.order('phase_number', {
      ascending: true,
    });

    if (error) throw error;

    return NextResponse.json(
      {
        projectId: params.projectId,
        total: phases?.length || 0,
        phases: phases || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Phase Detail Endpoint
#### File: `app/api/v1/helix/projects/[projectId]/phases/[phaseNumber]/route.ts` (NEW)
Get individual phase spec and status.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/helix/api-auth';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; phaseNumber: string } }
) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  const isValid = await verifyApiKey(apiKey, params.projectId);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

    const { data: phase, error: dbError } = await supabase
      .from('helix_build_phases')
      .select('*')
      .eq('project_id', params.projectId)
      .eq('phase_number', parseInt(params.phaseNumber))
      .single();

    if (dbError || !phase) {
      return NextResponse.json(
        { error: 'Phase not found' },
        { status: 404 }
      );
    }

    // Load spec file
    const specPath = path.join(
      process.cwd(),
      'mnt/Foundryv2/BuildPlan/phases',
      `Phase-${params.phaseNumber.padStart(3, '0')}-*.md`
    );

    let spec = '';
    try {
      const files = fs.readdirSync(path.dirname(specPath));
      const specFile = files.find(
        (f) => f.startsWith(`Phase-${params.phaseNumber.padStart(3, '0')}`) && f.endsWith('.md')
      );
      if (specFile) {
        spec = fs.readFileSync(
          path.join(path.dirname(specPath), specFile),
          'utf-8'
        );
      }
    } catch (e) {
      console.error('Failed to read spec file:', e);
    }

    return NextResponse.json(
      {
        phase,
        spec,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; phaseNumber: string } }
) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  const isValid = await verifyApiKey(apiKey, params.projectId);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

    const { data: phase, error } = await supabase
      .from('helix_build_phases')
      .update(body)
      .eq('project_id', params.projectId)
      .eq('phase_number', parseInt(params.phaseNumber))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ phase }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to update phase' },
      { status: 500 }
    );
  }
}
```

### 3. Phase Completion Endpoint
#### File: `app/api/v1/helix/projects/[projectId]/phases/[phaseNumber]/complete/route.ts` (NEW)
Mark phase as complete with evidence.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/helix/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; phaseNumber: string } }
) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  const isValid = await verifyApiKey(apiKey, params.projectId);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { commitHash, notes, evidence } = body;

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

    const { data: phase, error } = await supabase
      .from('helix_build_phases')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes || '',
        evidence: {
          commitHash,
          evidence,
          completedVia: 'API',
        },
      })
      .eq('project_id', params.projectId)
      .eq('phase_number', parseInt(params.phaseNumber))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        message: 'Phase completed successfully',
        phase,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to complete phase' },
      { status: 500 }
    );
  }
}
```

### 4. API Authentication & Rate Limiting
#### File: `lib/helix/api-auth.ts` (NEW)
Utility functions for API key verification and rate limiting.

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export const verifyApiKey = async (apiKey: string, projectId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('app_keys')
      .select('*')
      .eq('key', apiKey)
      .eq('project_id', projectId)
      .single();

    if (error || !data) return false;
    if (!data.is_active) return false;

    // Update last used timestamp
    await supabase
      .from('app_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return true;
  } catch (error) {
    console.error('API key verification failed:', error);
    return false;
  }
};

export const getRateLimit = async (apiKey: string): Promise<boolean> => {
  try {
    const { data: key } = await supabase
      .from('app_keys')
      .select('*')
      .eq('key', apiKey)
      .single();

    if (!key) return true;

    // Check rate limit: max 100 requests per minute
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count, error } = await supabase
      .from('api_requests')
      .select('*', { count: 'exact', head: true })
      .eq('app_key_id', key.id)
      .gt('created_at', oneMinuteAgo);

    if (error || !count) return false;
    return count >= 100;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return false;
  }
};

export const logApiRequest = async (apiKey: string, endpoint: string, status: number) => {
  try {
    const { data: key } = await supabase
      .from('app_keys')
      .select('id')
      .eq('key', apiKey)
      .single();

    if (key) {
      await supabase.from('api_requests').insert({
        app_key_id: key.id,
        endpoint,
        status,
        created_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Failed to log API request:', error);
  }
};
```

---

## File Structure
```
app/api/v1/helix/projects/[projectId]/
├── phases/
│   ├── route.ts (NEW) — GET list
│   └── [phaseNumber]/
│       ├── route.ts (NEW) — GET detail, PATCH update
│       └── complete/route.ts (NEW) — POST complete

lib/helix/
├── api-auth.ts (NEW)
```

---

## Dependencies
- Supabase
- Next.js
- fs (Node.js)
- path (Node.js)

---

## Tech Stack for This Phase
- TypeScript
- Next.js
- Node.js
- Supabase

---

## Acceptance Criteria
1. GET /api/v1/helix/projects/:id/phases returns all phases
2. GET /api/v1/helix/projects/:id/phases?filter=completed returns only completed
3. GET /api/v1/helix/projects/:id/phases/:number returns phase detail + spec
4. PATCH /api/v1/helix/projects/:id/phases/:number updates phase
5. POST /api/v1/helix/projects/:id/phases/:number/complete marks complete
6. API requires valid Bearer token in Authorization header
7. Rate limit enforces max 100 requests per minute per key
8. Invalid API key returns 403 status
9. Phase spec file is loaded and included in GET detail response
10. Completion evidence is stored as JSON in evidence field

---

## Testing Instructions
1. Create API key in database
2. Test GET phases list with valid key
3. Test GET phases list with invalid key (should 403)
4. Test rate limit by making 101 requests in 60s (should 429 on 101st)
5. Test GET phase detail with nonexistent phase (should 404)
6. Test PATCH update phase status
7. Test POST complete phase with commit hash
8. Verify spec file is loaded correctly
9. Test filter parameter (completed, pending, in_progress)
10. Verify rate limit resets after 60 seconds

---

## Notes for the AI Agent
- Reuse app_keys table from Foundry v1
- Log all API requests to api_requests table
- Consider adding response pagination for large result sets
- Add optional filter by epic, status
- Document API in OpenAPI/Swagger format
- Consider versioning strategy (v1, v2, etc.)
