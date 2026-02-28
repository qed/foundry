# Phase 123 — Sync Status Dashboard

## Objective
Create a visual dashboard showing bi-directional sync state between Helix Mode and v1 modules. Display per-entity-type sync status (synced, pending, conflict, unlinked), last sync timestamps, and include a manual sync trigger button.

## Prerequisites
- Phase 115 — Sync Architecture And Strategy — Sync service and logging infrastructure
- Phase 122 — Sync Conflict Resolution — Conflict detection and resolution logic

## Epic Context
**Epic:** 14 — Deep v1 Module Data Sync
**Phase:** 123 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
With bidirectional sync running continuously, stakeholders need visibility into what's syncing and what might be stuck or conflicted. A dedicated sync status dashboard provides at-a-glance information about the health of the sync system: which entity types are in sync, which have pending changes, which have conflicts, and which aren't linked to v1 yet. It also provides a manual trigger to force sync if automatic sync is delayed.

---

## Detailed Requirements

### 1. Sync Status Aggregator Service
#### File: `src/lib/sync/sync-status.ts` (NEW)
Query and aggregate sync status across all entity types and projects.

```typescript
// src/lib/sync/sync-status.ts

import { createClient } from '@/lib/supabase';

export type SyncStatusType = 'synced' | 'pending' | 'conflict' | 'unlinked';

export interface EntitySyncStatus {
  entity_type: string;
  total_count: number;
  synced_count: number;
  pending_count: number;
  conflict_count: number;
  unlinked_count: number;
  last_sync_time?: string;
  last_sync_direction?: 'helix-to-v1' | 'v1-to-helix';
}

export interface ProjectSyncStatus {
  project_id: string;
  project_name: string;
  overall_status: SyncStatusType;
  entity_statuses: EntitySyncStatus[];
  last_full_sync?: string;
  pending_operations: number;
  conflicts: number;
  sync_health_percentage: number; // 0-100
}

/**
 * Get sync status for all entity types in project
 */
export async function getProjectSyncStatus(projectId: string): Promise<ProjectSyncStatus> {
  const supabase = createClient();

  // Get project info
  const { data: project } = await supabase
    .from('helix_projects')
    .select('id, project_brief')
    .eq('id', projectId)
    .single();

  const projectName = project?.project_brief?.project_name || 'Unknown Project';

  const entityTypes: Array<[string, string]> = [
    ['helix_step', 'helix_steps'],
    ['work_order', 'work_orders'],
    ['feature_node', 'feature_nodes'],
    ['idea', 'ideas'],
    ['feedback_submission', 'feedback_submissions'],
  ];

  const entityStatuses: EntitySyncStatus[] = [];
  let totalPending = 0;
  let totalConflicts = 0;

  for (const [entityType, tableName] of entityTypes) {
    // Get total count
    const { count: totalCount } = await supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (totalCount === null) continue;

    // Get synced count (latest sync log entry with status='synced')
    const { count: syncedCount } = await supabase
      .from('helix_sync_log')
      .select('id', { count: 'exact', head: true })
      .eq('source_entity_type', entityType)
      .eq('status', 'synced')
      .order('created_at', { ascending: false })
      .limit(totalCount);

    // Get pending count
    const { count: pendingCount } = await supabase
      .from('helix_sync_log')
      .select('id', { count: 'exact', head: true })
      .eq('source_entity_type', entityType)
      .eq('status', 'pending');

    // Get conflict count
    const { count: conflictCount } = await supabase
      .from('sync_conflicts')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', entityType)
      .eq('status', 'unresolved');

    const unlinkedCount = totalCount - (syncedCount || 0);

    const status: EntitySyncStatus = {
      entity_type: entityType,
      total_count: totalCount,
      synced_count: syncedCount || 0,
      pending_count: pendingCount || 0,
      conflict_count: conflictCount || 0,
      unlinked_count: unlinkedCount,
    };

    // Get last sync time
    const { data: lastSync } = await supabase
      .from('helix_sync_log')
      .select('created_at, direction')
      .eq('source_entity_type', entityType)
      .eq('status', 'synced')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastSync) {
      status.last_sync_time = lastSync.created_at;
      status.last_sync_direction = lastSync.direction;
    }

    entityStatuses.push(status);
    totalPending += pendingCount || 0;
    totalConflicts += conflictCount || 0;
  }

  // Calculate overall health percentage
  const totalEntities = entityStatuses.reduce((sum, s) => sum + s.total_count, 0);
  const totalSynced = entityStatuses.reduce((sum, s) => sum + s.synced_count, 0);
  const healthPercentage = totalEntities > 0 ? Math.round((totalSynced / totalEntities) * 100) : 100;

  // Determine overall status
  let overallStatus: SyncStatusType = 'synced';
  if (totalConflicts > 0) overallStatus = 'conflict';
  else if (totalPending > 0) overallStatus = 'pending';
  else if (totalEntities > totalSynced) overallStatus = 'unlinked';

  return {
    project_id: projectId,
    project_name: projectName,
    overall_status: overallStatus,
    entity_statuses: entityStatuses,
    pending_operations: totalPending,
    conflicts: totalConflicts,
    sync_health_percentage: healthPercentage,
  };
}

/**
 * Get sync status for specific entity
 */
export async function getEntitySyncStatus(
  entityType: string,
  entityId: string
): Promise<{ status: SyncStatusType; lastSync?: string; conflicts?: any[] }> {
  const supabase = createClient();

  // Check last sync
  const { data: lastSync } = await supabase
    .from('helix_sync_log')
    .select('*')
    .eq('source_entity_type', entityType)
    .eq('source_entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Check for conflicts
  const { data: conflicts } = await supabase
    .from('sync_conflicts')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('status', 'unresolved');

  let status: SyncStatusType = 'unlinked';
  if (conflicts && conflicts.length > 0) {
    status = 'conflict';
  } else if (lastSync?.status === 'synced') {
    status = 'synced';
  } else if (lastSync?.status === 'pending') {
    status = 'pending';
  }

  return {
    status,
    lastSync: lastSync?.created_at,
    conflicts: conflicts || [],
  };
}
```

### 2. Sync Dashboard Component
#### File: `src/app/helix/projects/[projectId]/sync-dashboard.tsx` (NEW)
Main dashboard UI displaying sync status.

```typescript
// src/app/helix/projects/[projectId]/sync-dashboard.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { ProjectSyncStatus, EntitySyncStatus } from '@/lib/sync/sync-status';

interface SyncDashboardProps {
  projectId: string;
}

export function SyncDashboard({ projectId }: SyncDashboardProps) {
  const [syncStatus, setSyncStatus] = useState<ProjectSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [projectId]);

  async function loadSyncStatus() {
    const supabase = createClient();
    try {
      const response = await fetch(`/api/sync/status?projectId=${projectId}`);
      const data = await response.json();
      setSyncStatus(data);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function triggerManualSync() {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync/trigger-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        await loadSyncStatus();
      } else {
        alert('Failed to trigger sync');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      alert('Error triggering sync');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <div className="p-6">Loading sync status...</div>;
  if (!syncStatus) return <div className="p-6">No sync data available</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'conflict':
        return 'bg-red-100 text-red-800';
      case 'unlinked':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Sync Health</h2>
          <button
            onClick={triggerManualSync}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Manual Sync'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Overall Health</p>
            <p className="text-3xl font-bold text-blue-600">
              {syncStatus.sync_health_percentage}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <span className={`inline-block px-3 py-1 rounded font-semibold text-sm ${getStatusColor(syncStatus.overall_status)}`}>
              {syncStatus.overall_status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{syncStatus.pending_operations}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Conflicts</p>
            <p className="text-3xl font-bold text-red-600">{syncStatus.conflicts}</p>
          </div>
        </div>
      </div>

      {/* Entity Type Status */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 p-4 border-b">
          <h3 className="font-semibold">Entity Type Status</h3>
        </div>
        <div className="divide-y">
          {syncStatus.entity_statuses.map(entity => (
            <EntityStatusRow key={entity.entity_type} entity={entity} getStatusColor={getStatusColor} />
          ))}
        </div>
      </div>

      {/* Pending Operations */}
      {syncStatus.pending_operations > 0 && (
        <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
          <h3 className="font-semibold text-sm mb-2">
            Pending Operations: {syncStatus.pending_operations}
          </h3>
          <p className="text-sm text-gray-700">
            There are sync operations in progress. These will complete shortly.
          </p>
        </div>
      )}

      {/* Conflicts Alert */}
      {syncStatus.conflicts > 0 && (
        <div className="border rounded-lg p-4 bg-red-50 border-red-200">
          <h3 className="font-semibold text-sm mb-2 text-red-900">
            Conflicts: {syncStatus.conflicts}
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            There are unresolved sync conflicts that require manual attention.
          </p>
          <a href={`/helix/projects/${projectId}/sync-conflicts`} className="text-sm text-red-600 hover:underline">
            View and resolve conflicts →
          </a>
        </div>
      )}
    </div>
  );
}

interface EntityStatusRowProps {
  entity: EntitySyncStatus;
  getStatusColor: (status: string) => string;
}

function EntityStatusRow({ entity, getStatusColor }: EntityStatusRowProps) {
  const syncPercentage = entity.total_count > 0 ? Math.round((entity.synced_count / entity.total_count) * 100) : 100;

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-sm capitalize">{entity.entity_type.replace('_', ' ')}</h4>
          <p className="text-xs text-gray-600">
            {entity.synced_count} / {entity.total_count} synced
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor('synced')}`}>
            {syncPercentage}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
        <div
          className="bg-green-500 h-full transition-all duration-300"
          style={{ width: `${syncPercentage}%` }}
        />
      </div>

      {/* Status breakdown */}
      <div className="flex gap-2 text-xs">
        {entity.synced_count > 0 && (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
            Synced: {entity.synced_count}
          </span>
        )}
        {entity.pending_count > 0 && (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
            Pending: {entity.pending_count}
          </span>
        )}
        {entity.conflict_count > 0 && (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
            Conflicts: {entity.conflict_count}
          </span>
        )}
        {entity.unlinked_count > 0 && (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
            Unlinked: {entity.unlinked_count}
          </span>
        )}
      </div>

      {entity.last_sync_time && (
        <p className="text-xs text-gray-500 mt-2">
          Last sync: {new Date(entity.last_sync_time).toLocaleString()}
          {entity.last_sync_direction && ` (${entity.last_sync_direction})`}
        </p>
      )}
    </div>
  );
}
```

### 3. Sync Status API Endpoint
#### File: `src/app/api/sync/status/route.ts` (NEW)
API endpoint to fetch project sync status.

```typescript
// src/app/api/sync/status/route.ts

import { getProjectSyncStatus } from '@/lib/sync/sync-status';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
  }

  try {
    const syncStatus = await getProjectSyncStatus(projectId);
    return NextResponse.json(syncStatus);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

### 4. Manual Sync Trigger Endpoint
#### File: `src/app/api/sync/trigger-sync/route.ts` (NEW)
API endpoint to manually trigger sync for project.

```typescript
// src/app/api/sync/trigger-sync/route.ts

import { createClient } from '@/lib/supabase';
import { getSyncService } from '@/lib/sync/sync-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
  }

  const supabase = createClient();
  const syncService = getSyncService();

  try {
    // Get all pending sync events for project
    const { data: pendingEvents } = await supabase
      .from('helix_sync_log')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100);

    if (!pendingEvents || pendingEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending sync events',
        processed: 0,
      });
    }

    // Process pending events
    let processed = 0;
    for (const event of pendingEvents) {
      try {
        // Recreate SyncEvent from log and reprocess
        const syncEvent = {
          id: event.sync_event_id,
          event_id: event.sync_event_id,
          source_mode: event.source_mode,
          direction: event.status,
          entity_type: event.source_entity_type,
          entity_id: event.source_entity_id,
          action: 'update' as const,
          trigger_user_id: 'system',
          timestamp: new Date().toISOString(),
          payload: {},
        };

        await syncService.processSyncEvent(syncEvent);
        processed++;
      } catch (error) {
        console.error(`Failed to process pending event ${event.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} pending sync events`,
      processed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

---

## File Structure
```
src/lib/sync/
├── sync-status.ts (NEW)

src/app/helix/projects/[projectId]/
├── sync-dashboard.tsx (NEW)

src/app/api/sync/
├── status/ (NEW)
│   └── route.ts (NEW)
├── trigger-sync/ (NEW)
│   └── route.ts (NEW)
```

---

## Dependencies
- Phase 115 sync infrastructure
- Phase 122 conflict detection
- helix_sync_log table for audit trail
- sync_conflicts table for unresolved conflicts

---

## Tech Stack for This Phase
- TypeScript for aggregation logic
- React for dashboard UI
- Supabase for querying sync state
- Next.js API routes

---

## Acceptance Criteria
1. getProjectSyncStatus aggregates status for all entity types
2. Overall sync health percentage is calculated correctly (synced / total * 100)
3. Overall status is 'conflict' if any conflicts exist
4. Overall status is 'pending' if pending operations exist
5. EntitySyncStatus includes counts for synced, pending, conflict, unlinked
6. SyncDashboard displays overall health percentage
7. SyncDashboard displays status badge with color coding
8. SyncDashboard lists entity type status with progress bar
9. Manual Sync button calls POST /api/sync/trigger-sync
10. Sync status auto-refreshes every 10 seconds

---

## Testing Instructions
1. Create Helix project with synced entities
2. Call getProjectSyncStatus and verify overall status='synced'
3. Create pending sync event
4. Call getProjectSyncStatus and verify status='pending'
5. Create unresolved conflict
6. Call getProjectSyncStatus and verify status='conflict'
7. Load SyncDashboard component
8. Verify health percentage displays correctly
9. Click Manual Sync button
10. Verify pending operations are processed

---

## Notes for the AI Agent
- Health percentage should be easy to understand at a glance
- Color coding: green=synced, yellow=pending, red=conflict, gray=unlinked
- Last sync timestamp is important for debugging; always display it
- Manual sync is useful when automatic sync is delayed
- Consider adding filter by entity type to dashboard
- Refresh interval (10s) should be configurable
