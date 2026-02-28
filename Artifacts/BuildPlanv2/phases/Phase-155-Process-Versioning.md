# Phase 155 — Process Versioning

## Objective
Track changes to Helix process definitions over time. Version history with diffs, migrate in-progress projects to new versions, backward compatibility, and version comparison UI.

## Prerequisites
- Phase 149 — Custom Stage and Step Definitions — Process definition structure

## Epic Context
**Epic:** 19 — Process Customization & Advanced
**Phase:** 155 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Process definitions evolve. New stages are added, steps are removed, requirements change. Versioning tracks these changes. In-progress projects can optionally migrate to new versions, or stay on their original version for consistency. Version history enables audit trails and rollback capability.

---

## Detailed Requirements

### 1. Process Version Service
#### File: `lib/helix/processVersioning.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface ProcessVersion {
  versionNumber: number;
  orgId: string;
  stages: any[];
  changesSummary: string;
  createdAt: Date;
  createdBy: string;
}

export async function getCurrentProcessVersion(
  orgId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<number> {
  const { data, error } = await supabaseClient
    .from('helix_process_definitions')
    .select('version')
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.version || 1;
}

export async function getProcessVersionHistory(
  orgId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<ProcessVersion[]> {
  const { data, error } = await supabaseClient
    .from('helix_process_version_history')
    .select('*')
    .eq('org_id', orgId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createProcessVersion(
  orgId: string,
  stages: any[],
  changesSummary: string,
  userId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<number> {
  const currentVersion = await getCurrentProcessVersion(orgId, supabaseClient);
  const newVersion = currentVersion + 1;

  const { error } = await supabaseClient
    .from('helix_process_version_history')
    .insert([
      {
        org_id: orgId,
        version_number: newVersion,
        stages,
        changes_summary: changesSummary,
        created_by: userId,
      },
    ]);

  if (error) throw error;
  return newVersion;
}

export async function getProcessVersionDiff(
  orgId: string,
  fromVersion: number,
  toVersion: number,
  supabaseClient: ReturnType<typeof createClient>
): Promise<any> {
  const { data: versions, error } = await supabaseClient
    .from('helix_process_version_history')
    .select('*')
    .eq('org_id', orgId)
    .in('version_number', [fromVersion, toVersion]);

  if (error) throw error;

  const from = versions?.find(v => v.version_number === fromVersion);
  const to = versions?.find(v => v.version_number === toVersion);

  return {
    fromVersion,
    toVersion,
    stagesAdded: to?.stages?.filter((s: any) =>
      !from?.stages?.some((fs: any) => fs.name === s.name)
    ) || [],
    stagesRemoved: from?.stages?.filter((s: any) =>
      !to?.stages?.some((ts: any) => ts.name === s.name)
    ) || [],
    stagesModified: to?.stages?.filter((s: any) => {
      const fromStage = from?.stages?.find((fs: any) => fs.name === s.name);
      return fromStage && JSON.stringify(fromStage) !== JSON.stringify(s);
    }) || [],
  };
}

export async function migrateProjectToVersion(
  projectId: string,
  toVersion: number,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const { data: project } = await supabaseClient
    .from('projects')
    .select('org_id')
    .eq('id', projectId)
    .single();

  if (!project) throw new Error('Project not found');

  const { data: versionDef } = await supabaseClient
    .from('helix_process_version_history')
    .select('stages')
    .eq('org_id', project.org_id)
    .eq('version_number', toVersion)
    .single();

  if (!versionDef) throw new Error('Version not found');

  await supabaseClient
    .from('projects')
    .update({
      helix_process_version: toVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);
}

export async function getProjectProcessVersion(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<number> {
  const { data: project } = await supabaseClient
    .from('projects')
    .select('helix_process_version')
    .eq('id', projectId)
    .single();

  if (!project) throw new Error('Project not found');
  return project.helix_process_version || 1;
}
```

### 2. Process Versioning Schema
#### File: `migrations/add_helix_process_versioning.sql` (NEW)
```sql
ALTER TABLE helix_process_definitions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS helix_process_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  stages JSONB NOT NULL,
  changes_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(org_id, version_number)
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS helix_process_version INTEGER DEFAULT 1;

CREATE INDEX idx_process_version_history_org ON helix_process_version_history(org_id);
CREATE INDEX idx_process_version_history_version ON helix_process_version_history(version_number);

ALTER TABLE helix_process_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org version history"
  ON helix_process_version_history FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );
```

### 3. Version History UI Component
#### File: `components/helix/admin/ProcessVersionHistory.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface ProcessVersionHistoryProps {
  orgId: string;
}

export function ProcessVersionHistory({ orgId }: ProcessVersionHistoryProps) {
  const supabase = createClient();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [compareFromVersion, setCompareFromVersion] = useState<number | null>(null);
  const [compareTo, setCompareTo] = useState<number | null>(null);

  const { data: history } = useQuery({
    queryKey: ['process-version-history', orgId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/orgs/${orgId}/process-versions`);
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    },
  });

  const { data: diff } = useQuery({
    queryKey: ['process-version-diff', compareFromVersion, compareTo],
    queryFn: async () => {
      if (!compareFromVersion || !compareTo) return null;
      const response = await fetch(
        `/api/v1/orgs/${orgId}/process-versions/diff?from=${compareFromVersion}&to=${compareTo}`
      );
      if (!response.ok) throw new Error('Failed to fetch diff');
      return response.json();
    },
    enabled: !!compareFromVersion && !!compareTo,
  });

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Process Version History</h1>

      {/* Timeline */}
      <div className="space-y-3">
        {history?.versions?.map((version: any) => (
          <div
            key={version.versionNumber}
            className={`rounded-lg border p-4 cursor-pointer transition ${
              selectedVersion === version.versionNumber
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
            onClick={() => setSelectedVersion(version.versionNumber)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">Version {version.versionNumber}</p>
                <p className="text-sm text-gray-600 mt-1">{version.changesSummary}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(version.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                {version.stageCount} stages
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Version Comparison */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold">Compare Versions</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">From Version</label>
            <select
              value={compareFromVersion || ''}
              onChange={(e) => setCompareFromVersion(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select version</option>
              {history?.versions?.map((v: any) => (
                <option key={v.versionNumber} value={v.versionNumber}>
                  Version {v.versionNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">To Version</label>
            <select
              value={compareTo || ''}
              onChange={(e) => setCompareTo(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select version</option>
              {history?.versions?.map((v: any) => (
                <option key={v.versionNumber} value={v.versionNumber}>
                  Version {v.versionNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Diff Results */}
        {diff && (
          <div className="space-y-4 mt-4">
            {diff.stagesAdded?.length > 0 && (
              <div className="bg-green-50 rounded p-3">
                <p className="text-sm font-semibold text-green-900 mb-2">Stages Added</p>
                <ul className="space-y-1">
                  {diff.stagesAdded.map((stage: any) => (
                    <li key={stage.name} className="text-sm text-green-800">
                      + {stage.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {diff.stagesRemoved?.length > 0 && (
              <div className="bg-red-50 rounded p-3">
                <p className="text-sm font-semibold text-red-900 mb-2">Stages Removed</p>
                <ul className="space-y-1">
                  {diff.stagesRemoved.map((stage: any) => (
                    <li key={stage.name} className="text-sm text-red-800">
                      - {stage.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {diff.stagesModified?.length > 0 && (
              <div className="bg-yellow-50 rounded p-3">
                <p className="text-sm font-semibold text-yellow-900 mb-2">Stages Modified</p>
                <ul className="space-y-1">
                  {diff.stagesModified.map((stage: any) => (
                    <li key={stage.name} className="text-sm text-yellow-800">
                      ~ {stage.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Version Management</p>
        <ul className="list-disc list-inside space-y-1">
          <li>New versions created when process is updated</li>
          <li>Projects retain their version unless migrated</li>
          <li>In-progress projects can migrate to new versions</li>
          <li>Version history enables rollback and audit trails</li>
        </ul>
      </div>
    </div>
  );
}
```

---

## File Structure
```
migrations/
├── add_helix_process_versioning.sql (NEW)
lib/
└── helix/
    └── processVersioning.ts (NEW)
components/
└── helix/
    └── admin/
        └── ProcessVersionHistory.tsx (NEW)
```

---

## Acceptance Criteria
1. Process versions tracked in helix_process_version_history
2. Each version has unique number, stages, and change summary
3. Version diff shows stages added, removed, modified
4. Projects track helix_process_version
5. Projects can migrate to new versions
6. Old projects retain old version for backward compatibility
7. Version history UI shows all versions chronologically
8. Version comparison UI shows detailed diffs
9. Version migration audit trail created
10. API provides version history and diff endpoints

---

## Testing Instructions
1. Create version 1 with 5 stages
2. Modify process: add stage, remove stage
3. Create version 2, verify version incremented
4. View version history UI, verify both versions listed
5. Create diff from v1 to v2, verify changes shown
6. Create project with v1, verify helix_process_version=1
7. Create project with v2, verify helix_process_version=2
8. Migrate v1 project to v2, verify version updated
9. Verify old project still has old version if not migrated
10. Call API /process-versions, verify full history returned

---

## Notes for the AI Agent
- Versions immutable after creation (no editing old versions)
- Projects don't auto-migrate (manual approval process)
- Consider notification when new versions available
- Version diff shows structural changes only
- Future enhancement: auto-migration policies per org
