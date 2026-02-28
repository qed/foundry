# Phase 001 — Helix Mode Database Migration

## Objective
Establish the database foundation for Helix Mode by adding mode tracking to projects and creating three new tables to store step progression, evidence, and stage gate status. This phase ensures all data structures are in place before UI and logic layers are built.

## Prerequisites
- Foundry v1 app is running and accessible
- Supabase project is configured with v1 tables (profiles, organizations, org_members, projects, project_members, ideas, feature_nodes, blueprints, work_orders, phases, feedback_submissions, app_keys)
- Database migration tool access (Supabase SQL editor or migration script runner)
- Understanding of v1 RLS patterns and is_project_member helper

## Epic Context
**Epic:** 1 — Foundation & Mode Infrastructure
**Phase:** 001 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Helix Mode is a structured development process built into the existing Foundry v1 app. To enable this, we need to extend the database schema with three new tables that track project mode selection, step progression through the 8-stage process, and gate check status between stages. These tables will use JSON for flexible evidence storage (files, text, URLs, checklists) and follow v1's RLS patterns to ensure project members can only access their own project data.

The `mode` column on projects allows soft switching between Open Mode (v1) and Helix Mode (v2) without data migration. The `helix_steps` and `helix_stage_gates` tables form the audit trail and enforcement layer for the linear, quality-controlled process.

---

## Detailed Requirements

### 1. Add Mode Column to Projects Table
#### File: `supabase/migrations/042_add_helix_mode.sql` (NEW)
Add a `mode` enum column to the existing `projects` table with default value 'open'. This allows switching between Open Mode (existing v1 behavior) and Helix Mode (new quality-controlled process).

```sql
-- Add mode enum type if it doesn't exist
CREATE TYPE project_mode AS ENUM ('open', 'helix');

-- Add mode column to projects table
ALTER TABLE projects
ADD COLUMN mode project_mode DEFAULT 'open';

-- Add comment for clarity
COMMENT ON COLUMN projects.mode IS 'Project mode: open = v1 behavior, helix = quality-controlled Helix process';

-- Create index for efficient filtering
CREATE INDEX idx_projects_mode ON projects(mode);
```

### 2. Create Helix Steps Table
#### File: `supabase/migrations/043_create_helix_steps.sql` (NEW)
Create the `helix_steps` table to track progression through the 22 steps across 8 stages. Each record represents a step's current status and associated evidence.

```sql
-- Create helix_steps table
CREATE TABLE helix_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Step identification
  stage_number INT NOT NULL CHECK (stage_number >= 1 AND stage_number <= 8),
  step_number INT NOT NULL CHECK (step_number >= 1),
  step_key TEXT NOT NULL, -- e.g., '1.1', '2.3', '6.1'

  -- Step status
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'complete')),

  -- Evidence tracking
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('text', 'file', 'url', 'checklist')),
  evidence_data JSONB, -- Flexible storage for different evidence types

  -- Audit trail
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_step_per_project UNIQUE(project_id, step_key)
);

-- Create indexes for efficient queries
CREATE INDEX idx_helix_steps_project_id ON helix_steps(project_id);
CREATE INDEX idx_helix_steps_step_key ON helix_steps(step_key);
CREATE INDEX idx_helix_steps_status ON helix_steps(status);
CREATE INDEX idx_helix_steps_stage_number ON helix_steps(stage_number, step_number);
CREATE INDEX idx_helix_steps_project_stage ON helix_steps(project_id, stage_number);

-- Enable RLS
ALTER TABLE helix_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read steps if they are project members
CREATE POLICY helix_steps_read ON helix_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = helix_steps.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update steps if they are project members
CREATE POLICY helix_steps_update ON helix_steps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = helix_steps.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert steps if they are project members
CREATE POLICY helix_steps_insert ON helix_steps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = helix_steps.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Comment on table
COMMENT ON TABLE helix_steps IS 'Tracks progression through Helix Mode steps with evidence and audit trail';
```

### 3. Create Helix Stage Gates Table
#### File: `supabase/migrations/044_create_helix_stage_gates.sql` (NEW)
Create the `helix_stage_gates` table to enforce hard-block progression between stages. A stage gate must be passed (all steps in stage complete with valid evidence) before accessing the next stage.

```sql
-- Create helix_stage_gates table
CREATE TABLE helix_stage_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Gate identification
  stage_number INT NOT NULL CHECK (stage_number >= 1 AND stage_number <= 8),

  -- Gate status
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'passed')),

  -- Audit trail
  passed_at TIMESTAMPTZ,
  passed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_gate_per_project UNIQUE(project_id, stage_number)
);

-- Create indexes for efficient queries
CREATE INDEX idx_helix_stage_gates_project_id ON helix_stage_gates(project_id);
CREATE INDEX idx_helix_stage_gates_stage_number ON helix_stage_gates(stage_number);
CREATE INDEX idx_helix_stage_gates_status ON helix_stage_gates(status);
CREATE INDEX idx_helix_stage_gates_project_stage ON helix_stage_gates(project_id, stage_number);

-- Enable RLS
ALTER TABLE helix_stage_gates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read gates if they are project members
CREATE POLICY helix_stage_gates_read ON helix_stage_gates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = helix_stage_gates.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update gates if they are project members
CREATE POLICY helix_stage_gates_update ON helix_stage_gates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = helix_stage_gates.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert gates if they are project members
CREATE POLICY helix_stage_gates_insert ON helix_stage_gates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = helix_stage_gates.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Comment on table
COMMENT ON TABLE helix_stage_gates IS 'Tracks stage gate status to enforce linear progression through Helix stages';
```

### 4. Create Database Helpers & Utility Functions
#### File: `lib/db/helix.ts` (NEW)
Create utility functions for common Helix-related database queries and operations.

```typescript
import { createClient } from '@/lib/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

export interface HelixStep {
  id: string;
  project_id: string;
  stage_number: number;
  step_number: number;
  step_key: string;
  status: 'locked' | 'active' | 'complete';
  evidence_type: 'text' | 'file' | 'url' | 'checklist';
  evidence_data: Record<string, any> | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HelixStageGate {
  id: string;
  project_id: string;
  stage_number: number;
  status: 'locked' | 'active' | 'passed';
  passed_at: string | null;
  passed_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all steps for a project
 */
export async function getProjectSteps(
  projectId: string
): Promise<HelixStep[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('helix_steps')
    .select('*')
    .eq('project_id', projectId)
    .order('stage_number', { ascending: true })
    .order('step_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific step by key
 */
export async function getStepByKey(
  projectId: string,
  stepKey: string
): Promise<HelixStep | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('helix_steps')
    .select('*')
    .eq('project_id', projectId)
    .eq('step_key', stepKey)
    .single();

  if (error && error.code === 'PGRST116') return null; // Not found
  if (error) throw error;
  return data;
}

/**
 * Get all stage gates for a project
 */
export async function getProjectStageGates(
  projectId: string
): Promise<HelixStageGate[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('helix_stage_gates')
    .select('*')
    .eq('project_id', projectId)
    .order('stage_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get gate for a specific stage
 */
export async function getStageGate(
  projectId: string,
  stageNumber: number
): Promise<HelixStageGate | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('helix_stage_gates')
    .select('*')
    .eq('project_id', projectId)
    .eq('stage_number', stageNumber)
    .single();

  if (error && error.code === 'PGRST116') return null; // Not found
  if (error) throw error;
  return data;
}

/**
 * Update step status and evidence
 */
export async function updateStep(
  projectId: string,
  stepKey: string,
  updates: Partial<HelixStep>
): Promise<HelixStep> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('helix_steps')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('step_key', stepKey)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Initialize helix steps for a new Helix Mode project
 * Creates all 22 steps with locked status
 */
export async function initializeHelixSteps(
  projectId: string,
  steps: Array<{
    stage_number: number;
    step_number: number;
    step_key: string;
    evidence_type: 'text' | 'file' | 'url' | 'checklist';
  }>
): Promise<HelixStep[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('helix_steps')
    .insert(
      steps.map((step) => ({
        project_id: projectId,
        ...step,
        status: 'locked',
        evidence_data: null,
      }))
    )
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Initialize stage gates for a new Helix Mode project
 * Creates 8 gates with locked status
 */
export async function initializeStageGates(
  projectId: string
): Promise<HelixStageGate[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('helix_stage_gates')
    .insert(
      Array.from({ length: 8 }, (_, i) => ({
        project_id: projectId,
        stage_number: i + 1,
        status: 'locked',
      }))
    )
    .select();

  if (error) throw error;
  return data || [];
}
```

---

## File Structure
```
supabase/
├── migrations/
│   ├── 042_add_helix_mode.sql (NEW)
│   ├── 043_create_helix_steps.sql (NEW)
│   └── 044_create_helix_stage_gates.sql (NEW)

lib/
├── db/
│   └── helix.ts (NEW)

types/
├── database.ts (MODIFIED — added helix_steps, helix_stage_gates types, mode column)
```

---

## Dependencies
- Supabase SQL (native - no npm packages)
- TypeScript v5+
- @supabase/supabase-js (existing dependency)

---

## Tech Stack for This Phase
- PostgreSQL (Supabase)
- TypeScript
- RLS (Row Level Security)
- UUID primary keys
- JSONB for flexible evidence storage

---

## Acceptance Criteria
1. `projects` table has `mode` column with enum type `project_mode` ('open'|'helix'), defaulting to 'open'
2. `helix_steps` table created with all required columns: id, project_id, stage_number, step_number, step_key, status, evidence_type, evidence_data, completed_at, completed_by, created_at, updated_at
3. `helix_steps` table has unique constraint on (project_id, step_key)
4. `helix_steps` table has RLS policies for select, insert, and update matching v1 project_members pattern
5. `helix_stage_gates` table created with all required columns: id, project_id, stage_number, status, passed_at, passed_by, created_at, updated_at
6. `helix_stage_gates` table has unique constraint on (project_id, stage_number)
7. `helix_stage_gates` table has RLS policies for select, insert, and update matching v1 project_members pattern
8. All tables have appropriate indexes on project_id, step_key, status, and stage_number for query performance
9. `helix.ts` utility file exports functions: getProjectSteps, getStepByKey, getProjectStageGates, getStageGate, updateStep, initializeHelixSteps, initializeStageGates
10. Migrations can be applied to Supabase without errors and all RLS policies enforce project membership

---

## Testing Instructions
1. Apply migrations to Supabase using `supabase db push` or SQL editor
2. Verify `projects` table has `mode` column: `SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name='mode'`
3. Verify `helix_steps` table exists with correct schema: `\d helix_steps` in Supabase SQL editor
4. Verify `helix_stage_gates` table exists with correct schema: `\d helix_stage_gates` in Supabase SQL editor
5. Test RLS by querying `helix_steps` as non-project-member user (should return 0 rows)
6. Test RLS by querying `helix_steps` as project-member user (should return rows)
7. Verify unique constraints work: attempt to insert duplicate (project_id, step_key) and confirm error
8. Verify check constraints on status enum: attempt invalid status value and confirm error
9. Test utility functions in isolation: call `initializeHelixSteps` with test data and verify rows created
10. Verify foreign key cascading: delete a project and confirm all related helix_steps and helix_stage_gates are deleted

---

## Notes for the AI Agent
- These migrations are SQL-first; they don't require API routes yet
- The RLS policies use the same `project_members` table as v1, ensuring consistency
- The `step_key` format (e.g., '1.1', '2.3') is critical for later phases; enforce this naming
- `evidence_data` is JSONB to allow flexible storage: `{text: "...", file_url: "...", checklist_items: [...]}`
- Do not create any service_role bypass functions yet; gates and checks come in Phase 007
- The `initializeHelixSteps` and `initializeStageGates` functions will be called when a project switches to Helix Mode (Phase 002)
- Index creation is critical; test query performance on large projects (1000+ steps)
- The `completed_by` field should be set to `auth.uid()` when a step is marked complete
