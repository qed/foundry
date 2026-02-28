# Phase 149 — Custom Stage and Step Definitions

## Objective
Enable organizations to customize the Helix process by adding/removing/reordering stages and steps, with custom properties (title, description, instructions, evidence type) stored in helix_process_definitions table. Default to standard 8-stage process.

## Prerequisites
- Phase 135 — Core Helix Process Engine — Process structure foundation

## Epic Context
**Epic:** 19 — Process Customization & Advanced
**Phase:** 149 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Different organizations have different process needs. A research team might have 10+ stages, a startup 3 stages. Rather than hard-coding the standard 8-stage Helix process, allow organizations to customize stages and steps. Store custom definitions per organization, fallback to defaults.

This phase unlocks process flexibility while maintaining consistency.

---

## Detailed Requirements

### 1. Process Definition Schema and Service
#### File: `lib/helix/processDefinitions.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface StageDefinition {
  id?: string;
  stageNumber: number;
  name: string;
  description: string;
  order: number;
  steps: StepDefinition[];
}

export interface StepDefinition {
  id?: string;
  stepNumber: number;
  stageName: string;
  name: string;
  description: string;
  instructions: string;
  evidenceType: 'text' | 'file' | 'url' | 'checklist';
  required: boolean;
  order: number;
}

const DEFAULT_STAGES: StageDefinition[] = [
  {
    stageNumber: 1,
    name: 'Discovery & Planning',
    description: 'Gather requirements and plan the project',
    order: 1,
    steps: [
      {
        stepNumber: 1,
        stageName: 'Discovery & Planning',
        name: 'Requirement Analysis',
        description: 'Document project requirements',
        instructions: 'Create detailed requirement document',
        evidenceType: 'file',
        required: true,
        order: 1,
      },
    ],
  },
  {
    stageNumber: 2,
    name: 'Architecture & Design',
    description: 'Design system architecture and UI',
    order: 2,
    steps: [
      {
        stepNumber: 1,
        stageName: 'Architecture & Design',
        name: 'System Design',
        description: 'Document system architecture',
        instructions: 'Create architecture diagrams',
        evidenceType: 'file',
        required: true,
        order: 1,
      },
    ],
  },
  // ... more stages
];

export async function getProcessDefinition(
  orgId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<StageDefinition[]> {
  const { data: custom } = await supabaseClient
    .from('helix_process_definitions')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_default', false)
    .single();

  if (custom) {
    return custom.custom_stages;
  }

  // Return default if no custom definition exists
  return DEFAULT_STAGES;
}

export async function saveCustomProcessDefinition(
  orgId: string,
  stages: StageDefinition[],
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  // Check if definition exists
  const { data: existing } = await supabaseClient
    .from('helix_process_definitions')
    .select('id')
    .eq('org_id', orgId)
    .single();

  if (existing) {
    // Update
    await supabaseClient
      .from('helix_process_definitions')
      .update({
        custom_stages: stages,
        version: (existing.version || 0) + 1,
      })
      .eq('id', existing.id);
  } else {
    // Create
    await supabaseClient
      .from('helix_process_definitions')
      .insert([
        {
          org_id: orgId,
          custom_stages: stages,
          version: 1,
          is_default: false,
        },
      ]);
  }
}

export async function addStage(
  orgId: string,
  stage: StageDefinition,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const definition = await getProcessDefinition(orgId, supabaseClient);
  definition.push(stage);
  await saveCustomProcessDefinition(orgId, definition, supabaseClient);
}

export async function removeStage(
  orgId: string,
  stageName: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const definition = await getProcessDefinition(orgId, supabaseClient);
  const filtered = definition.filter(s => s.name !== stageName);
  await saveCustomProcessDefinition(orgId, filtered, supabaseClient);
}

export async function reorderStages(
  orgId: string,
  stageOrder: Array<{ name: string; order: number }>,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const definition = await getProcessDefinition(orgId, supabaseClient);

  definition.forEach((stage) => {
    const order = stageOrder.find(o => o.name === stage.name);
    if (order) {
      stage.order = order.order;
    }
  });

  await saveCustomProcessDefinition(orgId, definition, supabaseClient);
}

export async function updateStep(
  orgId: string,
  stageName: string,
  stepNumber: number,
  updates: Partial<StepDefinition>,
  supabaseClient: ReturnType<typeof createClient>
): Promise<void> {
  const definition = await getProcessDefinition(orgId, supabaseClient);

  const stage = definition.find(s => s.name === stageName);
  if (!stage) throw new Error('Stage not found');

  const step = stage.steps.find(st => st.stepNumber === stepNumber);
  if (!step) throw new Error('Step not found');

  Object.assign(step, updates);

  await saveCustomProcessDefinition(orgId, definition, supabaseClient);
}
```

### 2. Process Definition Schema
#### File: `migrations/add_helix_process_definitions.sql` (NEW)
```sql
CREATE TABLE IF NOT EXISTS helix_process_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  custom_stages JSONB NOT NULL, -- Array of StageDefinition
  is_default BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(org_id)
);

CREATE INDEX idx_process_definitions_org ON helix_process_definitions(org_id);

ALTER TABLE helix_process_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view process definitions"
  ON helix_process_definitions FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage process definitions"
  ON helix_process_definitions FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### 3. Process Customization UI Component
#### File: `components/helix/admin/ProcessCustomizer.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface ProcessCustomizerProps {
  orgId: string;
}

export function ProcessCustomizer({ orgId }: ProcessCustomizerProps) {
  const supabase = createClient();
  const [stages, setStages] = useState<any[]>([]);
  const [showNewStage, setShowNewStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  const { data: currentDef, refetch } = useQuery({
    queryKey: ['process-definition', orgId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/orgs/${orgId}/process-definition`);
      if (!response.ok) throw new Error('Failed to fetch definition');
      return response.json();
    },
    onSuccess: (data) => {
      setStages(data.definition);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/orgs/${orgId}/process-definition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages }),
      });
      if (!response.ok) throw new Error('Failed to save definition');
      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleAddStage = () => {
    if (!newStageName.trim()) return;

    const newStage = {
      id: `stage-${Date.now()}`,
      stageNumber: stages.length + 1,
      name: newStageName,
      description: '',
      order: stages.length + 1,
      steps: [],
    };

    setStages([...stages, newStage]);
    setNewStageName('');
    setShowNewStage(false);
  };

  const handleRemoveStage = (stageName: string) => {
    setStages(stages.filter(s => s.name !== stageName));
  };

  const handleReorderStages = (fromIndex: number, toIndex: number) => {
    const newStages = [...stages];
    const [removed] = newStages.splice(fromIndex, 1);
    newStages.splice(toIndex, 0, removed);

    // Update order numbers
    newStages.forEach((stage, idx) => {
      stage.order = idx + 1;
      stage.stageNumber = idx + 1;
    });

    setStages(newStages);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Process Customizer</h1>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Stages List */}
      <div className="bg-white rounded-lg shadow">
        {stages.map((stage, idx) => (
          <div key={stage.id} className="border-b p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  Stage {stage.stageNumber}: {stage.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                {idx > 0 && (
                  <button
                    onClick={() => handleReorderStages(idx, idx - 1)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                  >
                    ↑
                  </button>
                )}
                {idx < stages.length - 1 && (
                  <button
                    onClick={() => handleReorderStages(idx, idx + 1)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                  >
                    ↓
                  </button>
                )}
                <button
                  onClick={() => handleRemoveStage(stage.name)}
                  className="px-3 py-1 bg-red-200 text-red-700 rounded text-sm hover:bg-red-300"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Steps */}
            <div className="bg-gray-50 rounded p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {stage.steps?.length || 0} steps
              </p>
              {stage.steps?.map((step: any) => (
                <div key={step.id} className="text-sm text-gray-600 mb-1">
                  • {step.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Stage Form */}
      {showNewStage && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Stage</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Stage Name</label>
              <input
                type="text"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="e.g., Code Review"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddStage}
                disabled={!newStageName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                Add Stage
              </button>
              <button
                onClick={() => setShowNewStage(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!showNewStage && (
        <button
          onClick={() => setShowNewStage(true)}
          className="w-full px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"
        >
          + Add Stage
        </button>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Custom Process Configuration</p>
        <p>You have {stages.length} stages defined. New projects will use this configuration.</p>
      </div>
    </div>
  );
}
```

### 4. Process Definition API Endpoints
#### File: `app/api/v1/orgs/[id]/process-definition/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProcessDefinition, saveCustomProcessDefinition } from '@/lib/helix/processDefinitions';
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
    const definition = await getProcessDefinition(params.id, supabase);

    return NextResponse.json({
      orgId: params.id,
      definition,
      stageCount: definition.length,
    });
  } catch (error) {
    console.error('Process definition API error:', error);
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
    await saveCustomProcessDefinition(params.id, body.stages, supabase);

    return NextResponse.json({ message: 'Process definition updated' });
  } catch (error) {
    console.error('Save definition error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
migrations/
└── add_helix_process_definitions.sql (NEW)
lib/
└── helix/
    └── processDefinitions.ts (NEW)
components/
└── helix/
    └── admin/
        └── ProcessCustomizer.tsx (NEW)
app/
└── api/
    └── v1/
        └── orgs/
            └── [id]/
                └── process-definition/
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
- Supabase (process definition storage and RLS)
- React (UI components)
- TailwindCSS v4

---

## Acceptance Criteria
1. Default Helix process defined with 8 standard stages
2. Organizations can add custom stages
3. Organizations can remove stages
4. Organizations can reorder stages
5. Custom definitions stored in helix_process_definitions table
6. Get process definition returns custom if exists, default otherwise
7. New projects use org's custom process definition if available
8. UI allows adding stages with name and description
9. UI allows removing stages with confirmation
10. UI allows reordering stages with up/down buttons

---

## Testing Instructions
1. Create org with no custom process definition
2. GET /api/v1/orgs/:id/process-definition, verify default returned
3. Add custom stage via UI
4. Save process definition
5. Verify custom definition stored in database
6. GET process definition again, verify custom returned
7. Reorder stages via UI
8. Verify order persisted
9. Remove stage via UI
10. Verify stage removed from database

---

## Notes for the AI Agent
- Default stages should align with standard Helix process
- Consider template process definitions for different industries
- Future enhancement: duplicate existing definitions as templates
- Stage and step customization should be idempotent
