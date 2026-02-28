# Phase 121 — Bi-Directional Sync: Open Mode Changes

## Objective
Implement reverse sync: when v1 module data changes (work_order status, feature_node updates, idea edits), reflect those changes back in Helix. Use Supabase triggers and realtime subscriptions to detect changes and update helix_build_phases and helix_steps accordingly.

## Prerequisites
- Phase 115 — Sync Architecture And Strategy — Sync service and conflict handling defined
- Phase 118 — Phase Specs To Assembly Floor Work Orders — Work order creation and linking established

## Epic Context
**Epic:** 14 — Deep v1 Module Data Sync
**Phase:** 121 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Previous phases focused on Helix → v1 syncs (pushing data outward). But stakeholders also make changes in v1 modules that should flow back into Helix. For example, if a work order status is updated to 'done', the corresponding Helix step should reflect that completion. This phase implements the reverse direction, creating a truly bi-directional sync system where changes propagate in both directions.

---

## Detailed Requirements

### 1. V1 Change Listener Service
#### File: `src/lib/sync/listeners/v1-change-listener.ts` (NEW)
Listen for changes in v1 tables and create sync events.

```typescript
// src/lib/sync/listeners/v1-change-listener.ts

import { createClient } from '@/lib/supabase';
import { getSyncService } from '../sync-service';
import type { SyncEvent } from '../types';

/**
 * Subscribe to v1 work_order changes and sync back to Helix
 */
export function subscribeToWorkOrderChanges(projectId: string) {
  const supabase = createClient();

  const subscription = supabase
    .from(`work_orders:project_id=eq.${projectId}`)
    .on('*', async (payload) => {
      try {
        await handleWorkOrderChange(payload);
      } catch (error) {
        console.error('[Sync] Work order change listener error:', error);
      }
    })
    .subscribe();

  return subscription;
}

/**
 * Subscribe to v1 feature_node changes
 */
export function subscribeToFeatureNodeChanges(projectId: string) {
  const supabase = createClient();

  const subscription = supabase
    .from(`feature_nodes:project_id=eq.${projectId}`)
    .on('*', async (payload) => {
      try {
        await handleFeatureNodeChange(payload);
      } catch (error) {
        console.error('[Sync] Feature node change listener error:', error);
      }
    })
    .subscribe();

  return subscription;
}

/**
 * Subscribe to v1 idea changes
 */
export function subscribeToIdeaChanges() {
  const supabase = createClient();

  const subscription = supabase
    .from('ideas')
    .on('*', async (payload) => {
      try {
        await handleIdeaChange(payload);
      } catch (error) {
        console.error('[Sync] Idea change listener error:', error);
      }
    })
    .subscribe();

  return subscription;
}

/**
 * Handle work order status/content changes
 */
async function handleWorkOrderChange(payload: any) {
  const { eventType, new: newData, old: oldData } = payload;
  const syncService = getSyncService();

  if (!newData?.metadata?.helix_step_id) {
    return; // Not linked to Helix
  }

  const syncEvent: SyncEvent = {
    id: crypto.randomUUID(),
    event_id: `work-order-${newData.id}-${Date.now()}`,
    source_mode: 'v1',
    direction: 'v1-to-helix',
    entity_type: 'work_order',
    entity_id: newData.id,
    action: eventType === 'DELETE' ? 'delete' : 'update',
    trigger_user_id: newData.updated_by || newData.created_by,
    timestamp: new Date().toISOString(),
    payload: {
      status: newData.status,
      title: newData.title,
      description: newData.description,
      acceptance_criteria: newData.acceptance_criteria,
    },
    metadata: {
      helix_step_id: newData.metadata.helix_step_id,
      changed_fields: getChangedFields(oldData, newData),
    },
  };

  await syncService.processSyncEvent(syncEvent);

  console.log(`[Sync] Work Order ${newData.id} → Helix: ${eventType}`);
}

/**
 * Handle feature node updates
 */
async function handleFeatureNodeChange(payload: any) {
  const { eventType, new: newData } = payload;
  const syncService = getSyncService();

  const syncEvent: SyncEvent = {
    id: crypto.randomUUID(),
    event_id: `feature-node-${newData.id}-${Date.now()}`,
    source_mode: 'v1',
    direction: 'v1-to-helix',
    entity_type: 'feature_node',
    entity_id: newData.id,
    action: eventType === 'DELETE' ? 'delete' : 'update',
    trigger_user_id: newData.updated_by || newData.created_by,
    timestamp: new Date().toISOString(),
    payload: {
      name: newData.name,
      description: newData.description,
      status: newData.status,
    },
    metadata: {
      phase_number: newData.metadata?.phase_number,
    },
  };

  await syncService.processSyncEvent(syncEvent);
}

/**
 * Handle idea updates
 */
async function handleIdeaChange(payload: any) {
  const { eventType, new: newData } = payload;

  if (!newData?.helix_project_id || !newData?.helix_step_id) {
    return; // Not linked to Helix
  }

  const syncService = getSyncService();

  const syncEvent: SyncEvent = {
    id: crypto.randomUUID(),
    event_id: `idea-${newData.id}-${Date.now()}`,
    source_mode: 'v1',
    direction: 'v1-to-helix',
    entity_type: 'idea',
    entity_id: newData.id,
    action: eventType === 'DELETE' ? 'delete' : 'update',
    trigger_user_id: newData.updated_by || newData.created_by,
    timestamp: new Date().toISOString(),
    payload: {
      title: newData.title,
      body: newData.body,
      status: newData.status,
    },
    metadata: {
      helix_project_id: newData.helix_project_id,
      helix_step_id: newData.helix_step_id,
    },
  };

  await syncService.processSyncEvent(syncEvent);
}

/**
 * Detect which fields changed between old and new data
 */
function getChangedFields(oldData: any, newData: any): string[] {
  const changed: string[] = [];
  if (!oldData) return Object.keys(newData);

  Object.keys(newData).forEach(key => {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changed.push(key);
    }
  });

  return changed;
}
```

### 2. Enhanced Sync Service for V1 → Helix
#### File: `src/lib/sync/sync-service.ts` (UPDATED)
Add methods to handle V1 → Helix sync in the existing SyncService.

```typescript
// src/lib/sync/sync-service.ts (UPDATED methods)

/**
 * Sync from v1 to Helix (added to SyncService class)
 */
private async syncV1ToHelix(event: SyncEvent): Promise<SyncResult> {
  let result: SyncResult;

  switch (event.entity_type) {
    case 'work_order':
      result = await this.syncWorkOrderToHelix(event);
      break;
    case 'feature_node':
      result = await this.syncFeatureNodeToHelix(event);
      break;
    case 'idea':
      result = await this.syncIdeaToHelix(event);
      break;
    default:
      throw new Error(`No sync handler for entity type: ${event.entity_type}`);
  }

  return result;
}

/**
 * Sync work order status to Helix step
 */
private async syncWorkOrderToHelix(event: SyncEvent): Promise<SyncResult> {
  const supabase = createClient();
  const helixStepId = event.metadata?.helix_step_id;

  if (!helixStepId) {
    throw new Error('Work order not linked to Helix step');
  }

  // Map v1 status to Helix status
  const WORKORDER_TO_HELIX_STATUS: Record<string, string> = {
    'backlog': 'planning',
    'in-progress': 'in-progress',
    'review': 'in-review',
    'done': 'completed',
  };

  const helixStatus = WORKORDER_TO_HELIX_STATUS[event.payload.status];

  if (!helixStatus) {
    console.warn(`Unknown work order status: ${event.payload.status}`);
    return {
      sync_id: '',
      sync_event_id: event.id,
      status: 'failed' as any,
      source_entity_type: event.entity_type,
      source_entity_id: event.entity_id,
      target_entity_type: 'helix_step' as any,
      target_entity_id: helixStepId,
      error_message: `Unknown status: ${event.payload.status}`,
      duration_ms: 0,
    };
  }

  const { error } = await supabase
    .from('helix_steps')
    .update({
      status: helixStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', helixStepId);

  if (error) {
    throw new Error(`Failed to update Helix step: ${error.message}`);
  }

  return {
    sync_id: '',
    sync_event_id: event.id,
    status: 'synced' as any,
    source_entity_type: event.entity_type,
    source_entity_id: event.entity_id,
    target_entity_type: 'helix_step' as any,
    target_entity_id: helixStepId,
    duration_ms: 0,
  };
}

/**
 * Sync feature node updates to Build Plan artifacts
 */
private async syncFeatureNodeToHelix(event: SyncEvent): Promise<SyncResult> {
  const supabase = createClient();

  // Find related phase spec artifact
  const { data: artifact } = await supabase
    .from('artifacts')
    .select('id')
    .eq('type', 'phase_spec')
    .eq('metadata->feature_node_id', event.entity_id)
    .single();

  if (!artifact) {
    // No direct artifact link; log as unlinked
    return {
      sync_id: '',
      sync_event_id: event.id,
      status: 'synced' as any,
      source_entity_type: event.entity_type,
      source_entity_id: event.entity_id,
      target_entity_type: 'helix_artifact' as any,
      error_message: 'No linked phase spec found',
      duration_ms: 0,
    };
  }

  // Update artifact metadata with feature node changes
  const { error } = await supabase
    .from('artifacts')
    .update({
      metadata: {
        feature_node_status: event.payload.status,
        last_v1_update: new Date().toISOString(),
      },
    })
    .eq('id', artifact.id);

  if (error) {
    throw new Error(`Failed to update artifact: ${error.message}`);
  }

  return {
    sync_id: '',
    sync_event_id: event.id,
    status: 'synced' as any,
    source_entity_type: event.entity_type,
    source_entity_id: event.entity_id,
    target_entity_type: 'helix_artifact' as any,
    target_entity_id: artifact.id,
    duration_ms: 0,
  };
}

/**
 * Sync idea changes back to Helix project brief
 */
private async syncIdeaToHelix(event: SyncEvent): Promise<SyncResult> {
  const supabase = createClient();
  const helixProjectId = event.metadata?.helix_project_id;
  const helixStepId = event.metadata?.helix_step_id;

  if (!helixStepId) {
    throw new Error('Idea not linked to Helix step');
  }

  // Update step evidence with updated idea content
  const { error } = await supabase
    .from('helix_steps')
    .update({
      evidence_data: {
        project_name: event.payload.title,
        project_description: event.payload.body,
      },
      metadata: {
        idea_sync_status: 'synced',
        last_idea_sync: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', helixStepId);

  if (error) {
    throw new Error(`Failed to update Helix step: ${error.message}`);
  }

  return {
    sync_id: '',
    sync_event_id: event.id,
    status: 'synced' as any,
    source_entity_type: event.entity_type,
    source_entity_id: event.entity_id,
    target_entity_type: 'helix_step' as any,
    target_entity_id: helixStepId,
    duration_ms: 0,
  };
}
```

### 3. V1 Change Listener Registration Hook
#### File: `src/hooks/useV1SyncListeners.ts` (NEW)
React hook to manage v1 change listener subscriptions in Helix UI.

```typescript
// src/hooks/useV1SyncListeners.ts

import { useEffect, useRef } from 'react';
import {
  subscribeToWorkOrderChanges,
  subscribeToFeatureNodeChanges,
  subscribeToIdeaChanges,
} from '@/lib/sync/listeners/v1-change-listener';

/**
 * Hook: Register v1 change listeners for active project
 */
export function useV1SyncListeners(projectId: string) {
  const subscriptionsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!projectId) return;

    // Subscribe to changes
    const workOrderSub = subscribeToWorkOrderChanges(projectId);
    const featureNodeSub = subscribeToFeatureNodeChanges(projectId);
    const ideaSub = subscribeToIdeaChanges();

    subscriptionsRef.current = [workOrderSub, featureNodeSub, ideaSub];

    return () => {
      // Cleanup: unsubscribe on unmount
      subscriptionsRef.current.forEach(sub => {
        sub?.unsubscribe();
      });
    };
  }, [projectId]);

  return {
    isListening: subscriptionsRef.current.length > 0,
  };
}
```

### 4. Sync Status Indicator Component
#### File: `src/app/helix/projects/[projectId]/sync-status-indicator.tsx` (NEW)
Show real-time sync status in Helix UI.

```typescript
// src/app/helix/projects/[projectId]/sync-status-indicator.tsx

'use client';

import { useEffect, useState } from 'react';
import { useV1SyncListeners } from '@/hooks/useV1SyncListeners';
import { createClient } from '@/lib/supabase';

interface SyncStatusIndicatorProps {
  projectId: string;
}

export function SyncStatusIndicator({ projectId }: SyncStatusIndicatorProps) {
  const { isListening } = useV1SyncListeners(projectId);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  useEffect(() => {
    // Poll for recent sync operations
    const interval = setInterval(async () => {
      const supabase = createClient();

      const { data } = await supabase
        .from('helix_sync_log')
        .select('*')
        .eq('source_mode', 'v1')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data?.length > 0) {
        setLastSyncTime(data[0].created_at);
      }

      // Check for pending syncs
      const { data: pending } = await supabase
        .from('helix_sync_log')
        .select('id')
        .eq('status', 'pending')
        .eq('source_mode', 'v1');

      setPendingSyncs(pending?.length || 0);
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-gray-700">
          {isListening ? 'Listening for v1 changes' : 'Sync paused'}
        </span>
      </div>

      {lastSyncTime && (
        <span className="text-gray-500">
          Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
        </span>
      )}

      {pendingSyncs > 0 && (
        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
          {pendingSyncs} pending
        </span>
      )}
    </div>
  );
}
```

### 5. Database Migrations
#### File: `supabase/migrations/v1_to_helix_triggers.sql` (NEW)
Create SQL triggers for v1 → Helix sync (as fallback if Realtime unavailable).

```sql
-- supabase/migrations/v1_to_helix_triggers.sql

-- Trigger: Sync work order status changes to Helix steps
CREATE OR REPLACE FUNCTION sync_workorder_status_to_helix()
RETURNS TRIGGER AS $$
DECLARE
  helix_step_id UUID;
  helix_status TEXT;
BEGIN
  -- Get linked Helix step
  helix_step_id := (NEW.metadata->>'helix_step_id')::UUID;

  IF helix_step_id IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Map v1 status to Helix status
    helix_status := CASE
      WHEN NEW.status = 'backlog' THEN 'planning'
      WHEN NEW.status = 'in-progress' THEN 'in-progress'
      WHEN NEW.status = 'review' THEN 'in-review'
      WHEN NEW.status = 'done' THEN 'completed'
      ELSE 'planning'
    END;

    -- Update Helix step
    UPDATE helix_steps
    SET status = helix_status,
        updated_at = NOW()
    WHERE id = helix_step_id;

    -- Log sync event
    INSERT INTO helix_sync_log (
      sync_event_id, source_mode, entity_type, source_entity_id,
      target_entity_id, status, created_at
    ) VALUES (
      'work-order-' || NEW.id::TEXT || '-' || EXTRACT(EPOCH FROM NOW())::TEXT,
      'v1', 'work_order', NEW.id, helix_step_id, 'synced', NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_workorder_to_helix ON work_orders;
CREATE TRIGGER trg_sync_workorder_to_helix
AFTER UPDATE ON work_orders
FOR EACH ROW
EXECUTE FUNCTION sync_workorder_status_to_helix();

-- Trigger: Sync idea status changes
CREATE OR REPLACE FUNCTION sync_idea_to_helix()
RETURNS TRIGGER AS $$
DECLARE
  helix_step_id UUID;
BEGIN
  helix_step_id := (NEW.helix_step_id);

  IF helix_step_id IS NOT NULL AND (OLD.body IS DISTINCT FROM NEW.body OR OLD.title IS DISTINCT FROM NEW.title) THEN
    -- Update Helix step evidence with new idea content
    UPDATE helix_steps
    SET evidence_data = jsonb_build_object(
      'project_name', NEW.title,
      'project_description', NEW.body
    ),
    metadata = jsonb_set(metadata, '{idea_sync_status}', '"synced"'),
    updated_at = NOW()
    WHERE id = helix_step_id;

    -- Log sync event
    INSERT INTO helix_sync_log (
      sync_event_id, source_mode, entity_type, source_entity_id,
      target_entity_id, status, created_at
    ) VALUES (
      'idea-' || NEW.id::TEXT || '-' || EXTRACT(EPOCH FROM NOW())::TEXT,
      'v1', 'idea', NEW.id, helix_step_id, 'synced', NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_idea_to_helix ON ideas;
CREATE TRIGGER trg_sync_idea_to_helix
AFTER UPDATE ON ideas
FOR EACH ROW
EXECUTE FUNCTION sync_idea_to_helix();
```

---

## File Structure
```
src/lib/sync/listeners/
├── v1-change-listener.ts (NEW)

src/lib/sync/
├── sync-service.ts (UPDATED)

src/hooks/
├── useV1SyncListeners.ts (NEW)

src/app/helix/projects/[projectId]/
├── sync-status-indicator.tsx (NEW)

supabase/migrations/
└── v1_to_helix_triggers.sql (NEW)
```

---

## Dependencies
- Phase 115 sync infrastructure (SyncService)
- Phase 118 work order linking to helix_steps
- Phase 116 idea linking to helix_steps
- Supabase Realtime for subscriptions
- helix_sync_log table for audit trail

---

## Tech Stack for This Phase
- Supabase Realtime subscriptions for change detection
- TypeScript for type-safe sync handlers
- React hooks for listener lifecycle management
- SQL triggers as fallback mechanism

---

## Acceptance Criteria
1. subscribeToWorkOrderChanges creates Realtime subscription to work_orders table
2. subscribeToFeatureNodeChanges creates Realtime subscription to feature_nodes table
3. subscribeToIdeaChanges creates Realtime subscription to ideas table
4. handleWorkOrderChange creates SyncEvent with v1-to-helix direction
5. handleWorkOrderChange extracts helix_step_id from metadata
6. syncWorkOrderToHelix maps v1 status to Helix status using WORKORDER_TO_HELIX_STATUS
7. syncWorkOrderToHelix updates helix_steps.status and updated_at
8. syncIdeaToHelix updates helix_steps.evidence_data with idea title and body
9. useV1SyncListeners hook manages subscriptions and cleanup
10. SyncStatusIndicator displays isListening status and lastSyncTime

---

## Testing Instructions
1. Create work order linked to Helix step with helix_step_id in metadata
2. Update work order status to 'in-progress'
3. Verify Helix step status automatically changes to 'in-progress'
4. Update work order status to 'done'
5. Verify Helix step status changes to 'completed'
6. Edit linked idea (change title/body)
7. Verify Helix step evidence_data is updated
8. Check helix_sync_log for all sync operations
9. Load Helix project page and verify SyncStatusIndicator shows "Listening"
10. Verify lastSyncTime updates when v1 changes occur

---

## Notes for the AI Agent
- Realtime subscriptions should be used; SQL triggers are backup only
- Unsubscribe on component unmount to prevent memory leaks
- Status mapping must be consistent with Phase 118
- Consider performance: don't sync too frequently (use debouncing if needed)
- Error handling should log failures but not break Helix workflow
- This is eventual consistency; there may be brief delays between changes
