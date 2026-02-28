# Phase 122 — Sync Conflict Resolution

## Objective
Detect and resolve conflicts when the same data is modified in both Helix and v1 simultaneously. Implement conflict detection (timestamp and hash comparison), display UI for manual resolution, support auto-resolve for non-conflicting changes, and log all resolutions for audit.

## Prerequisites
- Phase 115 — Sync Architecture And Strategy — Sync types and conflict structure defined
- Phase 121 — Bi-Directional Sync: Open Mode Changes — Bi-directional sync in place

## Epic Context
**Epic:** 14 — Deep v1 Module Data Sync
**Phase:** 122 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
When bi-directional sync is active, there's a risk that the same entity is edited in both Helix and v1 before one direction's changes have been synced. This creates a conflict: which version is the "correct" one? This phase detects these conflicts, presents both versions to the user, allows manual resolution (pick one, merge, or discard), and logs the decision for audit compliance.

---

## Detailed Requirements

### 1. Conflict Detection Engine
#### File: `src/lib/sync/conflict-detection.ts` (NEW)
Detect conflicts by comparing timestamps, hashes, and previous states.

```typescript
// src/lib/sync/conflict-detection.ts

import crypto from 'crypto';
import type { SyncConflict } from './types';

export interface ConflictDetectionInput {
  entity_id: string;
  entity_type: string;
  helix_data: Record<string, any>;
  helix_timestamp: string;
  helix_user_id: string;
  v1_data: Record<string, any>;
  v1_timestamp: string;
  v1_user_id: string;
  previous_helix_hash?: string;
  previous_v1_hash?: string;
}

/**
 * Compute hash of entity data for change detection
 */
export function computeDataHash(data: Record<string, any>): string {
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Detect if changes are conflicting
 * A conflict occurs if both versions have changed from the baseline
 */
export function detectConflict(
  input: ConflictDetectionInput
): { conflicted: boolean; reason?: string } {
  // If both timestamps are identical, no real conflict (likely same sync)
  if (input.helix_timestamp === input.v1_timestamp) {
    return { conflicted: false };
  }

  // If hashes are provided, check if both versions changed from previous state
  if (input.previous_helix_hash && input.previous_v1_hash) {
    const helixHash = computeDataHash(input.helix_data);
    const v1Hash = computeDataHash(input.v1_data);

    const helixChanged = helixHash !== input.previous_helix_hash;
    const v1Changed = v1Hash !== input.previous_v1_hash;

    if (helixChanged && v1Changed) {
      return {
        conflicted: true,
        reason: 'Both Helix and v1 versions changed from baseline',
      };
    }
  }

  // Check if data structures diverged significantly
  const keyDiff = getKeyDifferences(input.helix_data, input.v1_data);
  if (keyDiff.length > 0) {
    return {
      conflicted: true,
      reason: `Diverged fields: ${keyDiff.join(', ')}`,
    };
  }

  return { conflicted: false };
}

/**
 * Find keys that differ between two objects
 */
export function getKeyDifferences(obj1: Record<string, any>, obj2: Record<string, any>): string[] {
  const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  const differences: string[] = [];

  keys.forEach(key => {
    if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      differences.push(key);
    }
  });

  return differences;
}

/**
 * Create SyncConflict record
 */
export function createConflictRecord(
  entityType: string,
  entityId: string,
  helixVersion: Record<string, any>,
  helixTimestamp: string,
  helixUserId: string,
  v1Version: Record<string, any>,
  v1Timestamp: string,
  v1UserId: string
): SyncConflict {
  return {
    conflict_id: crypto.randomUUID(),
    entity_type: entityType as any,
    entity_id: entityId,
    helix_version: {
      data: helixVersion,
      timestamp: helixTimestamp,
      user_id: helixUserId,
    },
    v1_version: {
      data: v1Version,
      timestamp: v1Timestamp,
      user_id: v1UserId,
    },
    detected_at: new Date().toISOString(),
  };
}

/**
 * Auto-resolve conflicts where changes don't overlap
 */
export function autoResolveNonConflictingChanges(
  helixData: Record<string, any>,
  v1Data: Record<string, any>,
  previousData: Record<string, any>
): Record<string, any> | null {
  const conflicts = getKeyDifferences(helixData, v1Data);

  // Track which keys were modified in each version
  const helixChanges = new Set<string>();
  const v1Changes = new Set<string>();

  Object.keys(previousData).forEach(key => {
    if (JSON.stringify(previousData[key]) !== JSON.stringify(helixData[key])) {
      helixChanges.add(key);
    }
    if (JSON.stringify(previousData[key]) !== JSON.stringify(v1Data[key])) {
      v1Changes.add(key);
    }
  });

  // If no overlapping changes, merge non-conflicting updates
  let hasOverlap = false;
  for (const key of helixChanges) {
    if (v1Changes.has(key)) {
      hasOverlap = true;
      break;
    }
  }

  if (!hasOverlap) {
    // Merge: take Helix changes and v1 changes, no conflict
    const merged = { ...previousData };
    helixChanges.forEach(key => (merged[key] = helixData[key]));
    v1Changes.forEach(key => (merged[key] = v1Data[key]));
    return merged;
  }

  // Conflict: overlapping changes
  return null;
}
```

### 2. Conflict Storage and Retrieval
#### File: `src/lib/sync/conflict-store.ts` (NEW)
Persist and query conflicts from database.

```typescript
// src/lib/sync/conflict-store.ts

import { createClient } from '@/lib/supabase';
import type { SyncConflict } from './types';

export interface ConflictResolution {
  conflict_id: string;
  winner: 'helix' | 'v1' | 'merged';
  merged_data?: Record<string, any>;
  resolved_by_user_id: string;
  resolved_at: string;
  notes?: string;
}

/**
 * Store a detected conflict
 */
export async function storeConflict(conflict: SyncConflict): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('sync_conflicts')
    .insert({
      conflict_id: conflict.conflict_id,
      entity_type: conflict.entity_type,
      entity_id: conflict.entity_id,
      helix_version: conflict.helix_version,
      v1_version: conflict.v1_version,
      detected_at: conflict.detected_at,
      status: 'unresolved',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store conflict: ${error.message}`);
  }

  return conflict.conflict_id;
}

/**
 * Get unresolved conflicts for entity
 */
export async function getUnresolvedConflicts(
  entityType: string,
  entityId: string
): Promise<SyncConflict[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('sync_conflicts')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('status', 'unresolved');

  if (error) {
    console.error('Failed to fetch conflicts:', error);
    return [];
  }

  return data || [];
}

/**
 * Resolve conflict with user decision
 */
export async function resolveConflict(
  conflictId: string,
  resolution: ConflictResolution
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('sync_conflicts')
    .update({
      status: 'resolved',
      resolution: {
        winner: resolution.winner,
        merged_data: resolution.merged_data,
        resolved_by_user_id: resolution.resolved_by_user_id,
        resolved_at: resolution.resolved_at,
        notes: resolution.notes,
      },
    })
    .eq('conflict_id', conflictId);

  if (error) {
    throw new Error(`Failed to resolve conflict: ${error.message}`);
  }

  // Log resolution for audit
  await supabase.from('sync_conflict_resolutions').insert({
    conflict_id: conflictId,
    winner: resolution.winner,
    resolved_by: resolution.resolved_by_user_id,
    resolved_at: resolution.resolved_at,
    notes: resolution.notes,
  });
}

/**
 * Get conflict resolution history
 */
export async function getConflictHistory(limit: number = 100): Promise<any[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('sync_conflict_resolutions')
    .select('*')
    .order('resolved_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch conflict history:', error);
    return [];
  }

  return data || [];
}
```

### 3. Conflict Resolution UI Component
#### File: `src/app/components/sync/conflict-resolver.tsx` (NEW)
Modal/dialog for users to resolve conflicts.

```typescript
// src/app/components/sync/conflict-resolver.tsx

'use client';

import { useState } from 'react';
import type { SyncConflict } from '@/lib/sync/types';
import { resolveConflict } from '@/lib/sync/conflict-store';

interface ConflictResolverProps {
  conflict: SyncConflict;
  onResolved: (winner: 'helix' | 'v1' | 'merged') => void;
  onCancel: () => void;
}

export function ConflictResolver({ conflict, onResolved, onCancel }: ConflictResolverProps) {
  const [selectedWinner, setSelectedWinner] = useState<'helix' | 'v1' | null>(null);
  const [mergedData, setMergedData] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const handleResolve = async () => {
    if (!selectedWinner && Object.keys(mergedData).length === 0) {
      alert('Please select a version or configure merge');
      return;
    }

    setResolving(true);
    try {
      const winner = selectedWinner || 'merged';
      const userId = 'current-user-id'; // Should come from context

      await resolveConflict(conflict.conflict_id, {
        conflict_id: conflict.conflict_id,
        winner,
        merged_data: winner === 'merged' ? mergedData : undefined,
        resolved_by_user_id: userId,
        resolved_at: new Date().toISOString(),
        notes,
      });

      onResolved(winner);
    } catch (error) {
      console.error('Error resolving conflict:', error);
      alert('Failed to resolve conflict');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Resolve Sync Conflict</h2>

          <p className="text-sm text-gray-600 mb-4">
            The same entity was modified in both Helix and v1. Choose which version to keep or merge
            them.
          </p>

          {/* Helix Version */}
          <div className="mb-4 p-4 border rounded bg-blue-50">
            <label className="flex items-start gap-2 cursor-pointer mb-2">
              <input
                type="radio"
                name="winner"
                value="helix"
                checked={selectedWinner === 'helix'}
                onChange={() => setSelectedWinner('helix')}
                className="mt-1"
              />
              <div className="flex-1">
                <span className="font-semibold text-sm">Helix Version</span>
                <p className="text-xs text-gray-600">
                  Modified by {conflict.helix_version.user_id} at{' '}
                  {new Date(conflict.helix_version.timestamp).toLocaleString()}
                </p>
              </div>
            </label>
            <pre className="bg-white p-2 rounded text-xs overflow-auto border border-blue-200">
              {JSON.stringify(conflict.helix_version.data, null, 2)}
            </pre>
          </div>

          {/* V1 Version */}
          <div className="mb-4 p-4 border rounded bg-green-50">
            <label className="flex items-start gap-2 cursor-pointer mb-2">
              <input
                type="radio"
                name="winner"
                value="v1"
                checked={selectedWinner === 'v1'}
                onChange={() => setSelectedWinner('v1')}
                className="mt-1"
              />
              <div className="flex-1">
                <span className="font-semibold text-sm">v1 Version</span>
                <p className="text-xs text-gray-600">
                  Modified by {conflict.v1_version.user_id} at{' '}
                  {new Date(conflict.v1_version.timestamp).toLocaleString()}
                </p>
              </div>
            </label>
            <pre className="bg-white p-2 rounded text-xs overflow-auto border border-green-200">
              {JSON.stringify(conflict.v1_version.data, null, 2)}
            </pre>
          </div>

          {/* Merge Option */}
          <div className="mb-4 p-4 border rounded bg-yellow-50">
            <label className="flex items-start gap-2 cursor-pointer mb-2">
              <input
                type="radio"
                name="winner"
                value="merged"
                checked={selectedWinner === 'merged' || Object.keys(mergedData).length > 0}
                onChange={() => {
                  setSelectedWinner(null);
                  setMergedData({
                    ...conflict.helix_version.data,
                    ...conflict.v1_version.data,
                  });
                }}
                className="mt-1"
              />
              <span className="font-semibold text-sm">Merge Both</span>
            </label>
            {Object.keys(mergedData).length > 0 && (
              <textarea
                value={JSON.stringify(mergedData, null, 2)}
                onChange={e => {
                  try {
                    setMergedData(JSON.parse(e.target.value));
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                className="w-full p-2 border rounded font-mono text-xs h-24"
              />
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Resolution Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Why did you choose this resolution?"
              className="w-full p-2 border rounded text-sm h-20"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              disabled={resolving}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={resolving || !selectedWinner}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {resolving ? 'Resolving...' : 'Resolve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 4. Database Migrations
#### File: `supabase/migrations/sync_conflicts.sql` (NEW)
Create tables for conflict tracking and resolution.

```sql
-- supabase/migrations/sync_conflicts.sql

-- Conflicts table
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID UNIQUE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  helix_version JSONB NOT NULL,
  v1_version JSONB NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'unresolved',
  resolution JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id);
CREATE INDEX idx_sync_conflicts_status ON sync_conflicts(status);

-- Conflict resolutions history
CREATE TABLE IF NOT EXISTS sync_conflict_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL REFERENCES sync_conflicts(conflict_id),
  winner TEXT NOT NULL CHECK (winner IN ('helix', 'v1', 'merged')),
  resolved_by UUID NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conflict_resolutions_conflict_id ON sync_conflict_resolutions(conflict_id);
CREATE INDEX idx_conflict_resolutions_resolved_by ON sync_conflict_resolutions(resolved_by);
```

---

## File Structure
```
src/lib/sync/
├── conflict-detection.ts (NEW)
├── conflict-store.ts (NEW)

src/app/components/sync/
├── conflict-resolver.tsx (NEW)

supabase/migrations/
└── sync_conflicts.sql (NEW)
```

---

## Dependencies
- Phase 115 SyncConflict type
- Phase 121 bi-directional sync
- Supabase for conflict storage and querying

---

## Tech Stack for This Phase
- Crypto hashing for change detection
- TypeScript for conflict logic
- React for conflict resolution UI
- PostgreSQL for conflict history

---

## Acceptance Criteria
1. detectConflict correctly identifies when both versions have diverged
2. computeDataHash produces consistent hashes for same data
3. getKeyDifferences returns all keys that differ between objects
4. autoResolveNonConflictingChanges merges non-overlapping changes
5. autoResolveNonConflictingChanges returns null when overlapping changes detected
6. storeConflict inserts conflict record to sync_conflicts table
7. getUnresolvedConflicts returns only unresolved conflicts for entity
8. resolveConflict updates conflict status to 'resolved' and stores resolution
9. ConflictResolver displays both versions side-by-side
10. ConflictResolver allows selection of winner or merge option

---

## Testing Instructions
1. Create entity in Helix and v1 simultaneously with different data
2. Call detectConflict with both versions
3. Verify conflicted=true is returned
4. Create data with non-overlapping changes
5. Call autoResolveNonConflictingChanges
6. Verify merged data includes both changes
7. Create data with overlapping changes
8. Verify autoResolveNonConflictingChanges returns null
9. Call storeConflict and verify it's persisted
10. Render ConflictResolver and test all three resolution paths

---

## Notes for the AI Agent
- Hash-based comparison is optional but recommended for detecting actual changes
- Timestamp comparison alone is insufficient; use hash for real change detection
- Auto-merge should only happen for truly non-conflicting changes
- Always log resolutions for audit purposes
- The UI should be clear about what each version contains
- Consider adding a "view history" option to understand how conflict arose
