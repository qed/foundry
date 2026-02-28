# Phase 118 — Phase Specs To Assembly Floor Work Orders

## Objective
Create work_orders in Assembly Floor from Helix phase specifications. Map phase titles to work order titles, phase descriptions to descriptions, and acceptance criteria to acceptance_criteria. Implement bi-directional status sync between phases and work orders.

## Prerequisites
- Phase 115 — Sync Architecture And Strategy — Sync service and types defined
- Phase 117 — Feature Tree From Build Plan To Pattern Shop — Build Plan structure understood

## Epic Context
**Epic:** 14 — Deep v1 Module Data Sync
**Phase:** 118 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Each Helix phase specification is a concrete deliverable with clear acceptance criteria. Assembly Floor's work_orders represent tasks that need to be completed by team members. By auto-creating work orders from phase specs, the team gets actionable tasks that reference the full context from Helix. Additionally, syncing status changes (Helix phase progress ↔ work order status) keeps both systems in sync automatically.

---

## Detailed Requirements

### 1. Phase Spec Parser
#### File: `src/lib/phase-spec/parser.ts` (NEW)
Parse phase spec files to extract title, description, and acceptance criteria.

```typescript
// src/lib/phase-spec/parser.ts

export interface PhaseSpecData {
  phase_number: number;
  phase_title: string;
  objective: string;
  acceptance_criteria: string[];
  detailed_requirements?: string;
  file_structure?: string;
  dependencies?: string[];
  tech_stack?: string[];
}

/**
 * Parse phase spec markdown file
 */
export function parsePhaseSpec(content: string): PhaseSpecData {
  // Extract phase number and title from heading
  const titleMatch = content.match(/^# Phase (\d+)[:\s—](.+?)$/m);
  if (!titleMatch) {
    throw new Error('Invalid phase spec: missing title');
  }

  const phaseNumber = parseInt(titleMatch[1]);
  const phaseTitle = titleMatch[2].trim();

  // Extract Objective section
  const objectiveMatch = content.match(/^## Objective\s*\n([\s\S]+?)(?=\n^##\s|\Z)/m);
  const objective = objectiveMatch?.[1]?.trim() || '';

  // Extract Acceptance Criteria section
  const acceptanceCriteriaMatch = content.match(
    /^## Acceptance Criteria\s*\n([\s\S]+?)(?=\n^##\s|\Z)/m
  );
  const acceptanceCriteria = acceptanceCriteriaMatch
    ? acceptanceCriteriaMatch[1]
        .split('\n')
        .filter(line => line.trim().match(/^[-*]|^\d+\./))
        .map(line => line.replace(/^[-*]\s+|\d+\.\s+/, '').trim())
        .filter(Boolean)
    : [];

  // Extract Detailed Requirements section
  const detailedMatch = content.match(
    /^## Detailed Requirements\s*\n([\s\S]+?)(?=\n^##\s|\Z)/m
  );
  const detailedRequirements = detailedMatch?.[1]?.trim();

  // Extract File Structure
  const fileStructMatch = content.match(/^## File Structure\s*\n([\s\S]+?)(?=\n^##\s|\Z)/m);
  const fileStructure = fileStructMatch?.[1]?.trim();

  // Extract Dependencies
  const depsMatch = content.match(/^## Dependencies\s*\n([\s\S]+?)(?=\n^##\s|\Z)/m);
  const dependencies = depsMatch
    ? depsMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s+/, '').trim())
        .filter(Boolean)
    : [];

  return {
    phase_number: phaseNumber,
    phase_title: phaseTitle,
    objective,
    acceptance_criteria: acceptanceCriteria,
    detailed_requirements: detailedRequirements,
    file_structure: fileStructure,
    dependencies,
  };
}
```

### 2. Work Order Creator
#### File: `src/lib/sync/work-orders/create-work-orders.ts` (NEW)
Create work orders from phase specs and link them to Assembly Floor phases.

```typescript
// src/lib/sync/work-orders/create-work-orders.ts

import { createClient } from '@/lib/supabase';
import type { PhaseSpecData } from '../phase-spec/parser';

export interface WorkOrderInput {
  title: string;
  description: string;
  acceptance_criteria: string[];
  phase_number?: number;
  epic_number?: number;
  helix_phase_spec_id?: string;
  status: 'backlog' | 'in-progress' | 'review' | 'done';
  metadata: {
    phase_number: number;
    epic_number?: number;
    source: 'helix_phase_spec';
    [key: string]: any;
  };
}

/**
 * Create work order from phase spec
 */
export async function createWorkOrderFromPhaseSpec(
  phaseSpec: PhaseSpecData,
  projectId: string,
  epicNumber: number,
  userId: string
): Promise<string> {
  const supabase = createClient();

  // Determine appropriate phase/status
  const workOrderInput: WorkOrderInput = {
    title: phaseSpec.phase_title,
    description: phaseSpec.objective,
    acceptance_criteria: phaseSpec.acceptance_criteria,
    phase_number: phaseSpec.phase_number,
    epic_number: epicNumber,
    status: 'backlog', // Initially backlog
    metadata: {
      phase_number: phaseSpec.phase_number,
      epic_number: epicNumber,
      source: 'helix_phase_spec',
      detailed_requirements: phaseSpec.detailed_requirements,
      file_structure: phaseSpec.file_structure,
      dependencies: phaseSpec.dependencies,
      created_from_helix: true,
    },
  };

  const { data, error } = await supabase
    .from('work_orders')
    .insert({
      ...workOrderInput,
      project_id: projectId,
      created_by: userId,
      created_at: new Date().toISOString(),
      assigned_to: null, // Not assigned initially
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create work order for Phase ${phaseSpec.phase_number}: ${error.message}`);
  }

  return data.id;
}

/**
 * Create Assembly Floor phase from epic grouping
 */
export async function createAssemblyFloorPhase(
  phaseName: string,
  epicNumber: number,
  projectId: string,
  userId: string
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('work_order_phases')
    .insert({
      name: phaseName,
      project_id: projectId,
      epic_number: epicNumber,
      status: 'planning', // Phase grouping status
      created_by: userId,
      created_at: new Date().toISOString(),
      metadata: {
        source: 'helix_build_plan',
      },
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create Assembly Floor phase: ${error.message}`);
  }

  return data.id;
}

/**
 * Batch create work orders for multiple phases
 */
export async function createWorkOrdersForEpic(
  phaseSpecs: PhaseSpecData[],
  projectId: string,
  epicNumber: number,
  userId: string
): Promise<{ phaseName: string; workOrderIds: string[] }> {
  const workOrderIds: string[] = [];

  for (const spec of phaseSpecs) {
    try {
      const workOrderId = await createWorkOrderFromPhaseSpec(
        spec,
        projectId,
        epicNumber,
        userId
      );
      workOrderIds.push(workOrderId);
    } catch (error) {
      console.error(`Error creating work order for phase ${spec.phase_number}:`, error);
    }
  }

  // Create Assembly Floor phase grouping
  const phaseName = `Epic ${epicNumber} Delivery Phase`;
  const assemblyPhaseId = await createAssemblyFloorPhase(phaseName, epicNumber, projectId, userId);

  return {
    phaseName,
    workOrderIds,
  };
}
```

### 3. Status Sync Mechanism
#### File: `src/lib/sync/work-orders/status-sync.ts` (NEW)
Bi-directional status sync: helix_steps.status ↔ work_orders.status

```typescript
// src/lib/sync/work-orders/status-sync.ts

import { createClient } from '@/lib/supabase';

export type Helix2V1StatusMap = {
  [key: string]: string;
};

/**
 * Map Helix step status to work order status
 */
export const HELIX_TO_WORKORDER_STATUS: Helix2V1StatusMap = {
  'planning': 'backlog',
  'in-progress': 'in-progress',
  'in-review': 'review',
  'completed': 'done',
  'blocked': 'backlog', // Blocked steps revert to backlog
};

/**
 * Map work order status to Helix step status
 */
export const WORKORDER_TO_HELIX_STATUS: Helix2V1StatusMap = {
  'backlog': 'planning',
  'in-progress': 'in-progress',
  'review': 'in-review',
  'done': 'completed',
};

/**
 * Sync Helix step status to work order
 */
export async function syncHelix2V1Status(
  helixStepId: string,
  helixStatus: string,
  projectId: string
) {
  const supabase = createClient();

  // Find linked work order
  const { data: step } = await supabase
    .from('helix_steps')
    .select('metadata')
    .eq('id', helixStepId)
    .single();

  if (!step?.metadata?.linked_work_order_id) {
    return; // No linked work order
  }

  const workOrderId = step.metadata.linked_work_order_id;
  const v1Status = HELIX_TO_WORKORDER_STATUS[helixStatus];

  if (!v1Status) {
    console.warn(`No mapping for Helix status: ${helixStatus}`);
    return;
  }

  // Update work order status
  const { error } = await supabase
    .from('work_orders')
    .update({
      status: v1Status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workOrderId);

  if (error) {
    console.error(`Failed to sync status to work order ${workOrderId}:`, error);
    return;
  }

  console.log(`[Sync] Helix Step ${helixStepId} → Work Order ${workOrderId}: ${helixStatus} → ${v1Status}`);
}

/**
 * Sync work order status back to Helix step
 */
export async function syncV12HelixStatus(
  workOrderId: string,
  workOrderStatus: string
) {
  const supabase = createClient();

  // Find linked Helix step
  const { data: workOrder } = await supabase
    .from('work_orders')
    .select('metadata')
    .eq('id', workOrderId)
    .single();

  if (!workOrder?.metadata?.helix_step_id) {
    return; // No linked Helix step
  }

  const helixStepId = workOrder.metadata.helix_step_id;
  const helixStatus = WORKORDER_TO_HELIX_STATUS[workOrderStatus];

  if (!helixStatus) {
    console.warn(`No mapping for work order status: ${workOrderStatus}`);
    return;
  }

  // Update Helix step status
  const { error } = await supabase
    .from('helix_steps')
    .update({
      status: helixStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', helixStepId);

  if (error) {
    console.error(`Failed to sync status to Helix step ${helixStepId}:`, error);
    return;
  }

  console.log(`[Sync] Work Order ${workOrderId} → Helix Step ${helixStepId}: ${workOrderStatus} → ${helixStatus}`);
}
```

### 4. Trigger Handlers
#### File: `src/lib/sync/triggers/on-phase-spec-created.ts` (NEW)
Trigger when phase spec artifact is created/updated.

```typescript
// src/lib/sync/triggers/on-phase-spec-created.ts

import { createClient } from '@/lib/supabase';
import { parsePhaseSpec } from '../phase-spec/parser';
import { createWorkOrderFromPhaseSpec } from './work-orders/create-work-orders';

export async function onPhaseSpecCreated(
  artifactId: string,
  projectId: string,
  userId: string,
  phaseSpecContent: string,
  epicNumber: number
) {
  const supabase = createClient();

  try {
    // Parse phase spec
    const phaseSpec = parsePhaseSpec(phaseSpecContent);

    // Create work order
    const workOrderId = await createWorkOrderFromPhaseSpec(
      phaseSpec,
      projectId,
      epicNumber,
      userId
    );

    // Link artifact to work order
    await supabase
      .from('artifacts')
      .update({
        metadata: {
          created_work_order_id: workOrderId,
        },
      })
      .eq('id', artifactId);

    // Link helix_steps to work order if this spec corresponds to a step
    // (This depends on phase numbering convention)
    await supabase
      .from('helix_steps')
      .update({
        metadata: {
          linked_work_order_id: workOrderId,
        },
      })
      .eq('phase_number', phaseSpec.phase_number)
      .eq('project_id', projectId);

    console.log(`[Sync] Phase Spec ${phaseSpec.phase_number} → Work Order ${workOrderId}`);

    return workOrderId;
  } catch (error) {
    console.error('[Sync Error] Phase Spec → Work Order failed:', error);
    throw error;
  }
}

/**
 * Supabase trigger for helix_steps status changes
 */
export async function registerHelix2V1StatusSync() {
  // This would be a SQL trigger that calls syncHelix2V1Status when helix_steps.status changes
  // SQL trigger registered separately in migrations
}
```

### 5. Work Order Status Badge Component
#### File: `src/app/open/assembly-floor/work-order-status-badge.tsx` (NEW)
Display work order status with Helix sync indicator.

```typescript
// src/app/open/assembly-floor/work-order-status-badge.tsx

'use client';

interface WorkOrderStatusBadgeProps {
  status: string;
  helixLinked?: boolean;
  helixStatus?: string;
}

export function WorkOrderStatusBadge({
  status,
  helixLinked,
  helixStatus,
}: WorkOrderStatusBadgeProps) {
  const statusColors: Record<string, string> = {
    'backlog': 'bg-gray-200 text-gray-800',
    'in-progress': 'bg-blue-200 text-blue-800',
    'review': 'bg-yellow-200 text-yellow-800',
    'done': 'bg-green-200 text-green-800',
  };

  const color = statusColors[status] || 'bg-gray-200 text-gray-800';

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
        {status}
      </span>
      {helixLinked && (
        <span className="text-xs text-gray-500">
          {helixStatus && `(Helix: ${helixStatus})`}
        </span>
      )}
    </div>
  );
}
```

### 6. Database Migrations
#### File: `supabase/migrations/work_orders_helix_sync.sql` (NEW)
Add Helix sync fields to work_orders and create triggers.

```sql
-- supabase/migrations/work_orders_helix_sync.sql

-- Add Helix sync metadata to work_orders if not exists
ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS helix_phase_id UUID,
ADD COLUMN IF NOT EXISTS helix_sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_helix_sync TIMESTAMP WITH TIME ZONE;

-- Create trigger: sync Helix step status to work order
CREATE OR REPLACE FUNCTION sync_helix_step_to_workorder()
RETURNS TRIGGER AS $$
DECLARE
  work_order_id UUID;
BEGIN
  -- Find linked work order via metadata
  SELECT linked_work_order_id INTO work_order_id
  FROM helix_steps
  WHERE id = NEW.id
  AND metadata->>'linked_work_order_id' IS NOT NULL;

  IF work_order_id IS NOT NULL THEN
    -- Map status
    UPDATE work_orders
    SET status = CASE
      WHEN NEW.status = 'planning' THEN 'backlog'
      WHEN NEW.status = 'in-progress' THEN 'in-progress'
      WHEN NEW.status = 'in-review' THEN 'review'
      WHEN NEW.status = 'completed' THEN 'done'
      ELSE 'backlog'
    END,
    updated_at = NOW()
    WHERE id = work_order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_helix_step_to_workorder
AFTER UPDATE ON helix_steps
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_helix_step_to_workorder();

-- Create trigger: sync work order status to Helix step
CREATE OR REPLACE FUNCTION sync_workorder_to_helix_step()
RETURNS TRIGGER AS $$
DECLARE
  helix_step_id UUID;
BEGIN
  -- Find linked Helix step via metadata
  SELECT helix_step_id INTO helix_step_id
  FROM work_orders
  WHERE id = NEW.id
  AND metadata->>'helix_step_id' IS NOT NULL;

  IF helix_step_id IS NOT NULL THEN
    -- Map status back
    UPDATE helix_steps
    SET status = CASE
      WHEN NEW.status = 'backlog' THEN 'planning'
      WHEN NEW.status = 'in-progress' THEN 'in-progress'
      WHEN NEW.status = 'review' THEN 'in-review'
      WHEN NEW.status = 'done' THEN 'completed'
      ELSE 'planning'
    END,
    updated_at = NOW()
    WHERE id = helix_step_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_workorder_to_helix_step
AFTER UPDATE ON work_orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_workorder_to_helix_step();
```

---

## File Structure
```
src/lib/phase-spec/
├── parser.ts (NEW)

src/lib/sync/work-orders/
├── create-work-orders.ts (NEW)
├── status-sync.ts (NEW)

src/lib/sync/triggers/
├── on-phase-spec-created.ts (NEW)

src/app/open/assembly-floor/
├── work-order-status-badge.tsx (NEW)

supabase/migrations/
└── work_orders_helix_sync.sql (NEW)
```

---

## Dependencies
- Phase 115 sync infrastructure
- work_orders table with helix_phase_id and metadata columns
- helix_steps table with status and metadata
- Phase spec artifact format and naming

---

## Tech Stack for This Phase
- TypeScript for parsing and type safety
- Supabase SQL triggers for automatic status sync
- React components for status display
- PL/pgSQL for bidirectional sync

---

## Acceptance Criteria
1. parsePhaseSpec extracts phase_number, title, objective, and acceptance criteria from spec markdown
2. createWorkOrderFromPhaseSpec creates work order with correct title and description
3. acceptance_criteria is properly extracted and stored as array in work order
4. Metadata includes phase_number, epic_number, and source='helix_phase_spec'
5. HELIX_TO_WORKORDER_STATUS mapping covers all Helix statuses
6. WORKORDER_TO_HELIX_STATUS includes reverse mappings
7. Supabase triggers fire on helix_steps.status updates
8. Work order status is updated when Helix step status changes
9. Helix step status is updated when work order status changes
10. WorkOrderStatusBadge displays current status and linked Helix status

---

## Testing Instructions
1. Parse sample phase spec markdown file
2. Verify extracted data matches expected structure
3. Create work order from parsed spec
4. Check work_orders table for correct data
5. Update Helix step status to 'in-progress'
6. Verify work order status automatically changes to 'in-progress'
7. Update work order status to 'done'
8. Verify Helix step status automatically changes to 'completed'
9. Create multiple work orders for an epic
10. Verify Assembly Floor phase grouping is created

---

## Notes for the AI Agent
- Status mapping is crucial: ensure consistency between Helix workflow and v1 statuses
- Triggers should be idempotent (don't cause infinite sync loops)
- Keep acceptance criteria as simple array; don't try to parse substructure
- This is bi-directional; changes in either system should sync
- Consider eventual consistency: there may be brief delays between sync events
