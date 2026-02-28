# Phase 153 — Organization-Level Process Defaults

## Objective
Set default Helix process configuration for all new projects at org level (default gate check strictness, evidence requirements, step assignments by role). Allow override at project level.

## Prerequisites
- Phase 149 — Custom Stage and Step Definitions — Process definitions
- Phase 151 — Custom Evidence Requirements — Evidence configuration

## Epic Context
**Epic:** 19 — Process Customization & Advanced
**Phase:** 153 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Organizations want consistency across projects but flexibility for exceptions. Set org-wide defaults (e.g., "all projects require >80% test coverage gate"), then allow individual projects to override. This is the "policy with exceptions" model.

---

## Detailed Requirements

### 1. Org Defaults Service
#### File: `lib/helix/orgDefaults.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface OrgProcessDefaults {
  orgId: string;
  gateSeverity: 'strict' | 'warning' | 'info'; // How strict to enforce gates
  minTestCoverage?: number; // 0-100 percent
  requireCICD?: boolean;
  requireCodeReview?: boolean;
  stepAssignmentByRole?: Record<string, string[]>; // role -> [step names]
  automationLevel: 'high' | 'medium' | 'low'; // How much AI automation to apply
}

export async function getOrgProcessDefaults(
  orgId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<OrgProcessDefaults> {
  const { data, error } = await supabaseClient
    .from('helix_org_process_defaults')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error;
  }

  return data || {
    orgId,
    gateSeverity: 'warning',
    automationLevel: 'medium',
  };
}

export async function setOrgProcessDefaults(
  orgId: string,
  defaults: Partial<OrgProcessDefaults>,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const { error } = await supabaseClient
    .from('helix_org_process_defaults')
    .upsert({
      org_id: orgId,
      ...defaults,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function applyOrgDefaultsToProject(
  orgId: string,
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const defaults = await getOrgProcessDefaults(orgId, supabaseClient);

  // Apply defaults to project settings
  const { error } = await supabaseClient
    .from('projects')
    .update({
      helix_gate_severity: defaults.gateSeverity,
      helix_min_test_coverage: defaults.minTestCoverage,
      helix_require_cicd: defaults.requireCICD,
      helix_require_code_review: defaults.requireCodeReview,
      helix_automation_level: defaults.automationLevel,
    })
    .eq('id', projectId);

  if (error) throw error;
}
```

### 2. Org Defaults Schema
#### File: `migrations/add_helix_org_process_defaults.sql` (NEW)
```sql
CREATE TABLE IF NOT EXISTS helix_org_process_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE UNIQUE,
  gate_severity TEXT DEFAULT 'warning', -- strict, warning, info
  min_test_coverage INTEGER,
  require_cicd BOOLEAN DEFAULT FALSE,
  require_code_review BOOLEAN DEFAULT TRUE,
  step_assignment_by_role JSONB DEFAULT '{}'::JSONB,
  automation_level TEXT DEFAULT 'medium', -- high, medium, low
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT valid_severity CHECK (gate_severity IN ('strict', 'warning', 'info')),
  CONSTRAINT valid_automation CHECK (automation_level IN ('high', 'medium', 'low'))
);

CREATE INDEX idx_org_defaults_org ON helix_org_process_defaults(org_id);

ALTER TABLE helix_org_process_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view defaults"
  ON helix_org_process_defaults FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage defaults"
  ON helix_org_process_defaults FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### 3. Org Defaults Configuration UI
#### File: `components/helix/admin/OrgProcessDefaults.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface OrgProcessDefaultsProps {
  orgId: string;
}

export function OrgProcessDefaults({ orgId }: OrgProcessDefaultsProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState<any>({});

  const { data: defaults, refetch } = useQuery({
    queryKey: ['org-defaults', orgId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/orgs/${orgId}/process-defaults`);
      if (!response.ok) throw new Error('Failed to fetch defaults');
      return response.json();
    },
    onSuccess: (data) => {
      setFormData(data.defaults || {});
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/orgs/${orgId}/process-defaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to save defaults');
      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Process Configuration Defaults</h1>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Gate Check Severity */}
        <div>
          <label className="block text-sm font-semibold mb-2">Gate Check Severity</label>
          <p className="text-sm text-gray-600 mb-3">How strictly gates are enforced</p>
          <select
            value={formData.gateSeverity || 'warning'}
            onChange={(e) => handleChange('gateSeverity', e.target.value)}
            className="px-3 py-2 border rounded-lg w-full md:w-48"
          >
            <option value="strict">Strict (blocks progression)</option>
            <option value="warning">Warning (alerts but proceeds)</option>
            <option value="info">Info (informational only)</option>
          </select>
        </div>

        {/* Test Coverage Requirement */}
        <div>
          <label className="block text-sm font-semibold mb-2">Minimum Test Coverage (%)</label>
          <p className="text-sm text-gray-600 mb-3">Required for all new projects</p>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.minTestCoverage || 0}
            onChange={(e) => handleChange('minTestCoverage', parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg w-full md:w-48"
          />
        </div>

        {/* Requirements */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Required Steps</p>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.requireCICD !== false}
              onChange={(e) => handleChange('requireCICD', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Require CI/CD Pipeline</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.requireCodeReview !== false}
              onChange={(e) => handleChange('requireCodeReview', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Require Code Review</span>
          </label>
        </div>

        {/* Automation Level */}
        <div>
          <label className="block text-sm font-semibold mb-2">Default Automation Level</label>
          <p className="text-sm text-gray-600 mb-3">How much AI automation to apply</p>
          <select
            value={formData.automationLevel || 'medium'}
            onChange={(e) => handleChange('automationLevel', e.target.value)}
            className="px-3 py-2 border rounded-lg w-full md:w-48"
          >
            <option value="high">High (automate most steps)</option>
            <option value="medium">Medium (balanced)</option>
            <option value="low">Low (mostly manual)</option>
          </select>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How Defaults Work</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Applied to all new projects automatically</li>
          <li>Existing projects not affected</li>
          <li>Can be overridden per project</li>
          <li>Changes only affect future projects</li>
        </ul>
      </div>
    </div>
  );
}
```

### 4. Org Defaults API Endpoints
#### File: `app/api/v1/orgs/[id]/process-defaults/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgProcessDefaults, setOrgProcessDefaults } from '@/lib/helix/orgDefaults';
import { verifyApiKey } from '@/lib/auth/apiKeys';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const defaults = await getOrgProcessDefaults(params.id, supabase);

    return NextResponse.json({
      orgId: params.id,
      defaults,
    });
  } catch (error) {
    console.error('Get org defaults error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    await setOrgProcessDefaults(params.id, body, supabase);

    return NextResponse.json({ message: 'Defaults updated' });
  } catch (error) {
    console.error('Set org defaults error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
migrations/
└── add_helix_org_process_defaults.sql (NEW)
lib/
└── helix/
    └── orgDefaults.ts (NEW)
components/
└── helix/
    └── admin/
        └── OrgProcessDefaults.tsx (NEW)
app/
└── api/
    └── v1/
        └── orgs/
            └── [id]/
                └── process-defaults/
                    └── route.ts (NEW)
```

---

## Acceptance Criteria
1. Org admins can set default gate severity
2. Org admins can set default minimum test coverage
3. Org admins can require CI/CD and code review
4. Org admins can set default automation level
5. Defaults applied to new projects automatically
6. Existing projects unaffected by default changes
7. Projects can override defaults at project level
8. API provides GET and POST for defaults
9. Defaults stored in helix_org_process_defaults table
10. All changes logged with timestamp

---

## Testing Instructions
1. Set org default: gate_severity='strict'
2. Create new project, verify gate severity set to strict
3. Change org default to 'warning'
4. Create another project, verify new default applied
5. Verify first project still uses strict
6. Set min_test_coverage=80
7. View org defaults via API, verify all settings
8. Update multiple settings, verify all persisted
9. Verify admin-only permissions enforced
10. Verify defaults affect new projects only

---

## Notes for the AI Agent
- Defaults are applied once at project creation (immutable after)
- Projects can override defaults via project settings
- Audit trail should log all default changes
- Consider broadcasting defaults change to all org members
