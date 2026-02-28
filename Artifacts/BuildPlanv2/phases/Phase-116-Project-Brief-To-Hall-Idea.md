# Phase 116 — Project Brief To Hall Idea

## Objective
Implement auto-creation of ideas in the Hall when Helix Step 1.3 saves a project brief. Map brief data to idea schema, create bi-directional linking, and handle reverse-sync when ideas are edited in Hall.

## Prerequisites
- Phase 115 — Sync Architecture And Strategy — Foundational sync types and mapping rules defined

## Epic Context
**Epic:** 14 — Deep v1 Module Data Sync
**Phase:** 116 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Step 1.3 ("Save Project Brief") in Helix Mode captures the comprehensive project scope, vision, and requirements. This is exactly what an idea represents in the Hall—a project concept with potential for growth. Automatically syncing the brief to the Hall as an idea ensures that project stakeholders can discuss, refine, and vote on the concept using v1's collaboration features. This phase implements the forward sync (Helix → Hall) and reverse sync (Hall → Helix) to keep both in sync.

---

## Detailed Requirements

### 1. Trigger: helix_steps Status Update
#### File: `src/lib/sync/triggers/on-step-1-3-complete.ts` (NEW)
Trigger function that fires when Step 1.3 status becomes 'completed'.

```typescript
// src/lib/sync/triggers/on-step-1-3-complete.ts

import { createClient } from '@/lib/supabase';
import { getSyncService } from '../sync-service';
import type { SyncEvent } from '../types';

/**
 * Trigger: When Step 1.3 ("Save Project Brief") completes,
 * auto-create idea in the Hall
 */
export async function onStep13Complete(
  projectId: string,
  stepId: string,
  briefData: Record<string, any>
) {
  const supabase = createClient();
  const syncService = getSyncService();

  try {
    // Fetch the completed step with evidence
    const { data: step } = await supabase
      .from('helix_steps')
      .select('*')
      .eq('id', stepId)
      .single();

    if (!step) throw new Error(`Step ${stepId} not found`);

    // Create SyncEvent
    const syncEvent: SyncEvent = {
      id: crypto.randomUUID(),
      event_id: `step-1-3-${projectId}-${Date.now()}`,
      source_mode: 'helix',
      direction: 'helix-to-v1',
      entity_type: 'helix_artifact',
      entity_id: stepId,
      action: 'create',
      trigger_user_id: step.created_by,
      timestamp: new Date().toISOString(),
      payload: {
        title: briefData.project_name || 'Untitled Project',
        content: briefData.project_description || '',
        scope: briefData.scope || '',
        success_criteria: briefData.success_criteria || '',
      },
      metadata: {
        helix_project_id: projectId,
        helix_step_id: stepId,
        source_step: '1.3',
        brief_version: briefData.version || '1.0',
      },
    };

    // Process sync
    const result = await syncService.processSyncEvent(syncEvent);

    if (result.status === 'synced' && result.target_entity_id) {
      // Link the idea back to the Helix step in metadata
      await supabase
        .from('helix_steps')
        .update({
          metadata: {
            ...(step.metadata || {}),
            linked_idea_id: result.target_entity_id,
            idea_sync_status: 'synced',
          },
        })
        .eq('id', stepId);

      console.log(`[Sync] Step 1.3 → Idea: ${result.target_entity_id}`);
    }

    return result;
  } catch (error) {
    console.error('[Sync Error] Step 1.3 → Idea failed:', error);
    throw error;
  }
}
```

### 2. Supabase Trigger (SQL)
#### File: `supabase/migrations/sync_step_1_3_to_idea.sql` (NEW)
Create a Supabase trigger to automatically invoke the sync when Step 1.3 completes.

```sql
-- supabase/migrations/sync_step_1_3_to_idea.sql

-- Trigger function to sync Step 1.3 completion to Hall ideas
CREATE OR REPLACE FUNCTION sync_step_1_3_to_idea()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process Step 1.3 completion
  IF NEW.step_number = '1.3'
     AND NEW.status = 'completed'
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Invoke the sync via Realtime event (or HTTP call to function)
    PERFORM pg_notify(
      'helix_sync_events',
      json_build_object(
        'event_type', 'step_1_3_completed',
        'project_id', NEW.project_id,
        'step_id', NEW.id,
        'brief_data', NEW.evidence_data
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_step_1_3_to_idea
AFTER UPDATE ON helix_steps
FOR EACH ROW
EXECUTE FUNCTION sync_step_1_3_to_idea();
```

### 3. Hall Idea Model Extension
#### File: `src/lib/models/idea.ts` (UPDATED)
Add Helix-related fields to the Idea type and schema.

```typescript
// src/lib/models/idea.ts (UPDATED)

export interface Idea {
  id: string;
  title: string;
  body: string;
  status: 'draft' | 'promoted' | 'archived';
  scope?: string;
  success_criteria?: string;

  // Helix integration fields
  helix_project_id?: string; // Links back to Helix project
  helix_step_id?: string; // Original Step 1.3 that created it
  helix_sync_status?: 'synced' | 'modified' | 'conflict';
  last_helix_sync?: string; // ISO timestamp

  // Standard fields
  created_by: string;
  created_at: string;
  updated_at: string;
  upvotes: number;
  comments_count: number;
}

/**
 * Update idea from Helix brief data
 */
export async function createIdeaFromBrief(
  briefData: Record<string, any>,
  userId: string,
  helixProjectId: string,
  helixStepId: string
): Promise<Idea> {
  const supabase = createClient();

  const idea: Partial<Idea> = {
    title: briefData.project_name || 'Untitled Project',
    body: briefData.project_description || '',
    status: 'promoted', // Helix briefs are promoted by default
    scope: briefData.scope,
    success_criteria: briefData.success_criteria,
    helix_project_id: helixProjectId,
    helix_step_id: helixStepId,
    helix_sync_status: 'synced',
    last_helix_sync: new Date().toISOString(),
    created_by: userId,
    created_at: new Date().toISOString(),
    upvotes: 0,
    comments_count: 0,
  };

  const { data, error } = await supabase
    .from('ideas')
    .insert(idea)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 4. Reverse Sync: Hall Idea → Helix
#### File: `src/lib/sync/triggers/on-idea-updated.ts` (NEW)
When an idea is edited in the Hall, flag it as modified in Helix and optionally sync back.

```typescript
// src/lib/sync/triggers/on-idea-updated.ts

import { createClient } from '@/lib/supabase';

/**
 * Trigger: When an idea linked to Helix is modified in the Hall,
 * flag the corresponding Helix step as modified
 */
export async function onIdeaUpdated(
  ideaId: string,
  ideaData: Record<string, any>,
  helix_project_id?: string,
  helix_step_id?: string
) {
  const supabase = createClient();

  try {
    if (helix_step_id) {
      // Flag the step as modified in Helix
      await supabase
        .from('helix_steps')
        .update({
          metadata: {
            linked_idea_id: ideaId,
            idea_sync_status: 'modified', // User edited idea in Hall
            last_idea_edit: new Date().toISOString(),
          },
        })
        .eq('id', helix_step_id);

      console.log(`[Sync] Idea ${ideaId} modified → Helix Step marked as modified`);
    }
  } catch (error) {
    console.error('[Sync Error] Idea → Helix sync failed:', error);
    throw error;
  }
}
```

### 5. Sync Status in Step Detail View
#### File: `src/app/helix/projects/[projectId]/steps/[stepId]/sync-status-card.tsx` (NEW)
UI component showing sync status with linked idea and sync history.

```typescript
// src/app/helix/projects/[projectId]/steps/[stepId]/sync-status-card.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Idea } from '@/lib/models/idea';

interface SyncStatusCardProps {
  stepId: string;
  metadata?: Record<string, any>;
}

export function SyncStatusCard({ stepId, metadata }: SyncStatusCardProps) {
  const [linkedIdea, setLinkedIdea] = useState<Idea | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'modified' | 'conflict' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLinkedIdea() {
      if (!metadata?.linked_idea_id) {
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', metadata.linked_idea_id)
        .single();

      if (!error && data) {
        setLinkedIdea(data);
        setSyncStatus(metadata?.idea_sync_status || 'synced');
      }
      setLoading(false);
    }

    fetchLinkedIdea();
  }, [metadata?.linked_idea_id, metadata?.idea_sync_status]);

  if (loading) return <div className="p-4">Loading sync status...</div>;

  if (!linkedIdea) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="text-sm text-gray-600">
          Not yet synced to Hall. Complete Step 1.3 to auto-create an idea.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-blue-50">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">Linked Idea in Hall</h4>
          <p className="text-sm text-gray-700 mt-1">{linkedIdea.title}</p>
        </div>
        <div className="text-right">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              syncStatus === 'synced'
                ? 'bg-green-200 text-green-800'
                : syncStatus === 'modified'
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-red-200 text-red-800'
            }`}
          >
            {syncStatus === 'synced' && 'Synced'}
            {syncStatus === 'modified' && 'Modified in Hall'}
            {syncStatus === 'conflict' && 'Conflict'}
          </span>
          <a
            href={`/open/hall/ideas/${linkedIdea.id}`}
            className="text-xs text-blue-600 hover:underline block mt-2"
          >
            View in Hall →
          </a>
        </div>
      </div>
      {syncStatus === 'modified' && (
        <p className="text-xs text-yellow-700 mt-2">
          The linked idea was edited in Hall. Review changes and sync back if needed.
        </p>
      )}
    </div>
  );
}
```

### 6. API Route for Sync Status
#### File: `src/app/api/sync/idea-status/route.ts` (NEW)
API endpoint to check and update sync status between idea and Helix step.

```typescript
// src/app/api/sync/idea-status/route.ts

import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stepId = searchParams.get('stepId');

  if (!stepId) {
    return NextResponse.json({ error: 'Missing stepId' }, { status: 400 });
  }

  const supabase = createClient();

  try {
    const { data: step, error } = await supabase
      .from('helix_steps')
      .select('metadata')
      .eq('id', stepId)
      .single();

    if (error) throw error;

    const linkedIdeaId = step?.metadata?.linked_idea_id;
    const syncStatus = step?.metadata?.idea_sync_status;

    if (!linkedIdeaId) {
      return NextResponse.json({
        synced: false,
        message: 'No linked idea yet',
      });
    }

    const { data: idea } = await supabase
      .from('ideas')
      .select('id, title, status, updated_at')
      .eq('id', linkedIdeaId)
      .single();

    return NextResponse.json({
      synced: true,
      idea,
      sync_status: syncStatus,
      last_helix_sync: step?.metadata?.last_helix_sync,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { stepId, action } = body;

  if (!stepId) {
    return NextResponse.json({ error: 'Missing stepId' }, { status: 400 });
  }

  const supabase = createClient();

  try {
    if (action === 'resync') {
      // Re-sync idea back from Hall to Helix
      const { data: step } = await supabase
        .from('helix_steps')
        .select('metadata')
        .eq('id', stepId)
        .single();

      const linkedIdeaId = step?.metadata?.linked_idea_id;

      if (linkedIdeaId) {
        const { data: idea } = await supabase
          .from('ideas')
          .select('*')
          .eq('id', linkedIdeaId)
          .single();

        // Update Helix step evidence with new idea data
        await supabase
          .from('helix_steps')
          .update({
            evidence_data: {
              project_name: idea.title,
              project_description: idea.body,
              scope: idea.scope,
              success_criteria: idea.success_criteria,
            },
            metadata: {
              ...step?.metadata,
              idea_sync_status: 'synced',
              last_helix_sync: new Date().toISOString(),
            },
          })
          .eq('id', stepId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

## File Structure
```
src/lib/sync/triggers/
├── on-step-1-3-complete.ts (NEW)
└── on-idea-updated.ts (NEW)

src/app/helix/projects/[projectId]/steps/[stepId]/
├── sync-status-card.tsx (NEW)

src/app/api/sync/
├── idea-status/ (NEW)
│   └── route.ts (NEW)

supabase/migrations/
└── sync_step_1_3_to_idea.sql (NEW)

src/lib/models/
└── idea.ts (UPDATED)
```

---

## Dependencies
- Phase 115 sync infrastructure (SyncService, types)
- helix_steps table with metadata JSONB column
- ideas table with helix_project_id, helix_step_id, helix_sync_status fields
- Supabase triggers and NOTIFY system
- RLS policies allowing sync operations

---

## Tech Stack for This Phase
- TypeScript for type safety
- Supabase PL/pgSQL triggers
- Next.js API routes
- React client components for UI
- Supabase Realtime for notifications

---

## Acceptance Criteria
1. onStep13Complete function creates a SyncEvent and calls processSyncEvent
2. SyncEvent payload includes title, content, scope, success_criteria from brief data
3. SyncEvent metadata links back to Helix project and step
4. Supabase trigger fires on Step 1.3 status update to 'completed'
5. Idea is created in Hall with status = 'promoted'
6. Helix step metadata is updated with linked_idea_id after successful sync
7. onIdeaUpdated function marks Helix step with idea_sync_status = 'modified'
8. SyncStatusCard displays linked idea info and current sync status
9. SyncStatusCard shows "View in Hall" link for linked idea
10. API endpoint returns correct sync status and linked idea data

---

## Testing Instructions
1. Create a Helix project and complete Step 1.3 with sample brief data
2. Verify that an idea is automatically created in the Hall with matching title
3. Confirm Helix step metadata contains linked_idea_id and sync_status = 'synced'
4. Edit the linked idea in Hall (change title or description)
5. Verify that Helix step metadata is updated with idea_sync_status = 'modified'
6. Fetch sync status via API endpoint and verify it returns 'modified'
7. Test resync action: POST to sync endpoint with action=resync
8. Verify Helix step evidence_data is updated with new idea content
9. Check that sync status returns to 'synced' after resync
10. Test concurrent edits: edit brief in Helix AND idea in Hall, verify conflict detection

---

## Notes for the AI Agent
- The sync is fire-and-forget; Helix doesn't wait for Hall sync to complete
- Flag 'modified' status in Helix when idea is edited in Hall; provide resync option
- Consider notification to project owner when Hall idea is updated
- Keep brief <-> idea sync lightweight; don't try to sync every field
- Document the direction: Helix → Hall is primary (create), Hall → Helix is secondary (flag)
