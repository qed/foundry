# Phase 124 — Sync Audit Trail

## Objective
Create a comprehensive audit trail for all sync operations. Log entity type, entity ID, source/target mode, action, before/after data, timestamp, and user. Make log queryable with filters. Retain logs for audit compliance (configurable retention).

## Prerequisites
- Phase 115 — Sync Architecture And Strategy — Sync service with logging interface
- Phase 121 — Bi-Directional Sync: Open Mode Changes — Bi-directional sync operations in place

## Epic Context
**Epic:** 14 — Deep v1 Module Data Sync
**Phase:** 124 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
For audit compliance and debugging, every sync operation must be logged. This creates a complete audit trail showing who initiated each change, what data was synced, when, in which direction, and with what outcome. This log enables compliance teams to prove data integrity, helps ops teams debug sync issues, and provides visibility into who changed what and when.

---

## Detailed Requirements

### 1. Audit Trail Schema and Logger
#### File: `src/lib/sync/audit-logger.ts` (NEW)
Core audit logging functionality.

```typescript
// src/lib/sync/audit-logger.ts

import { createClient } from '@/lib/supabase';

export type AuditAction = 'create' | 'update' | 'delete' | 'link' | 'unlink' | 'conflict-resolve';

export interface AuditLogEntry {
  id?: string;
  entity_type: string;
  entity_id: string;
  source_mode: 'helix' | 'v1' | 'system';
  target_mode: 'helix' | 'v1';
  direction: 'helix-to-v1' | 'v1-to-helix' | 'internal';
  action: AuditAction;
  user_id: string;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  changed_fields?: string[];
  timestamp: string;
  status: 'success' | 'failed' | 'partial';
  error_message?: string;
  conflict_id?: string;
  metadata?: {
    request_id?: string;
    sync_event_id?: string;
    parent_entity_id?: string;
    [key: string]: any;
  };
}

/**
 * Log a sync operation to audit trail
 */
export async function logSyncOperation(entry: AuditLogEntry): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('sync_audit_log')
    .insert({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      source_mode: entry.source_mode,
      target_mode: entry.target_mode,
      direction: entry.direction,
      action: entry.action,
      user_id: entry.user_id,
      before_data: entry.before_data || {},
      after_data: entry.after_data || {},
      changed_fields: entry.changed_fields || [],
      timestamp: entry.timestamp,
      status: entry.status,
      error_message: entry.error_message,
      conflict_id: entry.conflict_id,
      metadata: entry.metadata || {},
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[Audit] Failed to log sync operation:', error);
    throw error;
  }

  return data.id;
}

/**
 * Log a conflict resolution
 */
export async function logConflictResolution(
  conflictId: string,
  entityType: string,
  entityId: string,
  winner: 'helix' | 'v1' | 'merged',
  userId: string,
  mergedData?: Record<string, any>,
  notes?: string
): Promise<string> {
  const supabase = createClient();

  const logId = await logSyncOperation({
    entity_type: entityType,
    entity_id: entityId,
    source_mode: 'system',
    target_mode: 'helix',
    direction: 'internal',
    action: 'conflict-resolve',
    user_id: userId,
    after_data: mergedData,
    timestamp: new Date().toISOString(),
    status: 'success',
    conflict_id: conflictId,
    metadata: {
      resolution_winner: winner,
      resolution_notes: notes,
    },
  });

  return logId;
}

/**
 * Get audit log with optional filters
 */
export async function queryAuditLog(filters: {
  entity_type?: string;
  entity_id?: string;
  source_mode?: string;
  target_mode?: string;
  action?: AuditAction;
  user_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const supabase = createClient();

  let query = supabase.from('sync_audit_log').select('*', { count: 'exact' });

  // Apply filters
  if (filters.entity_type) {
    query = query.eq('entity_type', filters.entity_type);
  }
  if (filters.entity_id) {
    query = query.eq('entity_id', filters.entity_id);
  }
  if (filters.source_mode) {
    query = query.eq('source_mode', filters.source_mode);
  }
  if (filters.target_mode) {
    query = query.eq('target_mode', filters.target_mode);
  }
  if (filters.action) {
    query = query.eq('action', filters.action);
  }
  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.date_from) {
    query = query.gte('timestamp', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('timestamp', filters.date_to);
  }

  // Order and limit
  query = query.order('timestamp', { ascending: false });
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('[Audit] Failed to query audit log:', error);
    throw error;
  }

  return {
    entries: data || [],
    total: count || 0,
  };
}

/**
 * Export audit log for compliance
 */
export async function exportAuditLog(filters: any): Promise<string> {
  const { entries } = await queryAuditLog({ ...filters, limit: 10000 });

  // Convert to CSV
  const headers = [
    'Timestamp',
    'Entity Type',
    'Entity ID',
    'Action',
    'Source Mode',
    'Target Mode',
    'User ID',
    'Status',
    'Error',
  ];

  const rows = entries.map(entry => [
    entry.timestamp,
    entry.entity_type,
    entry.entity_id,
    entry.action,
    entry.source_mode,
    entry.target_mode,
    entry.user_id,
    entry.status,
    entry.error_message || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csv;
}

/**
 * Get audit statistics
 */
export async function getAuditStats(dateRange?: {
  from: string;
  to: string;
}): Promise<{
  total_operations: number;
  by_action: Record<AuditAction, number>;
  by_entity_type: Record<string, number>;
  by_direction: Record<string, number>;
  success_rate: number;
  errors: number;
}> {
  const supabase = createClient();

  let query = supabase.from('sync_audit_log').select('*');

  if (dateRange) {
    query = query
      .gte('timestamp', dateRange.from)
      .lte('timestamp', dateRange.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Audit] Failed to calculate stats:', error);
    throw error;
  }

  const entries = data || [];
  const stats = {
    total_operations: entries.length,
    by_action: {} as Record<AuditAction, number>,
    by_entity_type: {} as Record<string, number>,
    by_direction: {} as Record<string, number>,
    success_rate: 0,
    errors: 0,
  };

  for (const entry of entries) {
    stats.by_action[entry.action] = (stats.by_action[entry.action] || 0) + 1;
    stats.by_entity_type[entry.entity_type] = (stats.by_entity_type[entry.entity_type] || 0) + 1;
    stats.by_direction[entry.direction] = (stats.by_direction[entry.direction] || 0) + 1;

    if (entry.status === 'failed') {
      stats.errors++;
    }
  }

  stats.success_rate =
    entries.length > 0
      ? Math.round(((entries.length - stats.errors) / entries.length) * 100)
      : 100;

  return stats;
}
```

### 2. Database Schema and Retention Policy
#### File: `supabase/migrations/sync_audit_log.sql` (NEW)
Create audit log table with retention policy.

```sql
-- supabase/migrations/sync_audit_log.sql

-- Audit log table
CREATE TABLE IF NOT EXISTS sync_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  source_mode TEXT NOT NULL,
  target_mode TEXT NOT NULL,
  direction TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID NOT NULL,
  before_data JSONB,
  after_data JSONB,
  changed_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  conflict_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_audit_log_entity ON sync_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_timestamp ON sync_audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_user ON sync_audit_log(user_id);
CREATE INDEX idx_audit_log_action ON sync_audit_log(action);
CREATE INDEX idx_audit_log_direction ON sync_audit_log(direction);
CREATE INDEX idx_audit_log_status ON sync_audit_log(status);

-- Retention policy: keep logs for 2 years (configurable)
-- Older logs can be archived separately
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM sync_audit_log
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run monthly
-- (requires pg_cron extension - setup separately)
-- SELECT cron.schedule('cleanup-audit-logs', '0 0 1 * *', 'SELECT cleanup_old_audit_logs()');
```

### 3. Audit Log Viewer Component
#### File: `src/app/helix/projects/[projectId]/audit-log-viewer.tsx` (NEW)
UI for viewing and filtering audit logs.

```typescript
// src/app/helix/projects/[projectId]/audit-log-viewer.tsx

'use client';

import { useEffect, useState } from 'react';
import { queryAuditLog } from '@/lib/sync/audit-logger';

interface AuditLogViewerProps {
  projectId?: string;
  entityType?: string;
  entityId?: string;
}

export function AuditLogViewer({ projectId, entityType, entityId }: AuditLogViewerProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entity_type: entityType || '',
    action: '',
    status: '',
    user_id: '',
    date_from: '',
  });
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadAuditLog();
  }, [filters, page]);

  async function loadAuditLog() {
    setLoading(true);
    try {
      const response = await fetch('/api/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...filters,
          entity_id: entityId,
          limit: pageSize,
          offset: page * pageSize,
        }),
      });

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Failed to load audit log:', error);
    } finally {
      setLoading(false);
    }
  }

  const exportLog = async () => {
    try {
      const response = await fetch('/api/audit/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      const csv = await response.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export audit log:', error);
      alert('Failed to export audit log');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="font-semibold text-sm mb-3">Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Entity type"
            value={filters.entity_type}
            onChange={e => {
              setFilters({ ...filters, entity_type: e.target.value });
              setPage(0);
            }}
            className="px-3 py-2 border rounded text-sm"
          />
          <select
            value={filters.action}
            onChange={e => {
              setFilters({ ...filters, action: e.target.value });
              setPage(0);
            }}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="conflict-resolve">Conflict Resolve</option>
          </select>
          <select
            value={filters.status}
            onChange={e => {
              setFilters({ ...filters, status: e.target.value });
              setPage(0);
            }}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="partial">Partial</option>
          </select>
          <input
            type="date"
            value={filters.date_from}
            onChange={e => {
              setFilters({ ...filters, date_from: e.target.value });
              setPage(0);
            }}
            className="px-3 py-2 border rounded text-sm"
          />
        </div>
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <button
          onClick={exportLog}
          className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 text-sm"
        >
          Export CSV
        </button>
      </div>

      {/* Log entries */}
      {loading ? (
        <div className="p-4 text-center text-gray-600">Loading audit log...</div>
      ) : entries.length === 0 ? (
        <div className="p-4 text-center text-gray-600">No audit log entries found</div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Timestamp</th>
                  <th className="px-4 py-2 text-left font-semibold">Entity</th>
                  <th className="px-4 py-2 text-left font-semibold">Action</th>
                  <th className="px-4 py-2 text-left font-semibold">Direction</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2 text-left font-semibold">User</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {entry.entity_type}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs font-semibold">{entry.action}</span>
                    </td>
                    <td className="px-4 py-2 text-xs">{entry.direction}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-2 py-1 rounded font-semibold ${
                          entry.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">{entry.user_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, entries.length * 10)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={entries.length < pageSize}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

### 4. Audit Log API Endpoints
#### File: `src/app/api/audit/log/route.ts` (NEW)
Query audit log endpoint.

```typescript
// src/app/api/audit/log/route.ts

import { queryAuditLog } from '@/lib/sync/audit-logger';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const result = await queryAuditLog(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

#### File: `src/app/api/audit/export/route.ts` (NEW)
Export audit log to CSV.

```typescript
// src/app/api/audit/export/route.ts

import { exportAuditLog } from '@/lib/sync/audit-logger';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const csv = await exportAuditLog(body);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=audit-log.csv',
      },
    });
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
src/lib/sync/
├── audit-logger.ts (NEW)

src/app/helix/projects/[projectId]/
├── audit-log-viewer.tsx (NEW)

src/app/api/audit/
├── log/ (NEW)
│   └── route.ts (NEW)
├── export/ (NEW)
│   └── route.ts (NEW)

supabase/migrations/
└── sync_audit_log.sql (NEW)
```

---

## Dependencies
- Phase 115 sync infrastructure
- helix_sync_log for basic logging (Phase 123 references it)
- sync_audit_log table for comprehensive audit trail

---

## Tech Stack for This Phase
- Supabase PostgreSQL for audit storage
- TypeScript for audit logic
- React for log viewer UI
- CSV export for compliance reporting

---

## Acceptance Criteria
1. logSyncOperation creates entry with all required fields (entity_type, action, before/after data, timestamp, user)
2. logConflictResolution logs conflict resolutions with winner and notes
3. queryAuditLog supports filtering by entity_type, action, status, user_id, date range
4. queryAuditLog returns paginated results with total count
5. exportAuditLog generates CSV with headers and proper escaping
6. getAuditStats calculates success_rate, error count, and breakdowns by type
7. Audit log table has indexes on entity_type, timestamp, user_id, action
8. Retention policy removes logs older than 2 years
9. AuditLogViewer displays entries in sortable table with filters
10. Export button generates downloadable CSV file

---

## Testing Instructions
1. Create sync operation and call logSyncOperation
2. Verify entry is in sync_audit_log table with correct fields
3. Query audit log with various filters
4. Verify returned entries match filters
5. Export audit log and verify CSV format
6. Check CSV has proper headers and escaping
7. Call getAuditStats and verify calculations
8. Load AuditLogViewer component
9. Test filter and pagination functionality
10. Verify export button downloads file

---

## Notes for the AI Agent
- Audit log is append-only; never update or delete entries
- Always include user_id for accountability
- Before/after data helps with debugging and compliance
- Retention policy should be configurable (2 years is default)
- Export feature should be restricted to authorized users only
- Consider archiving old logs separately for long-term retention
