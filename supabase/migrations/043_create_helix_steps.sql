-- Phase 001: Create helix_steps table
-- Tracks progression through the 22 Helix Mode steps across 8 stages

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

-- Indexes for efficient queries
CREATE INDEX idx_helix_steps_project_id ON helix_steps(project_id);
CREATE INDEX idx_helix_steps_step_key ON helix_steps(step_key);
CREATE INDEX idx_helix_steps_status ON helix_steps(status);
CREATE INDEX idx_helix_steps_stage_number ON helix_steps(stage_number, step_number);
CREATE INDEX idx_helix_steps_project_stage ON helix_steps(project_id, stage_number);

-- Enable RLS
ALTER TABLE helix_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies using existing is_project_member() SECURITY DEFINER helper
CREATE POLICY "Project members can read helix steps"
  ON helix_steps FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Project members can insert helix steps"
  ON helix_steps FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Project members can update helix steps"
  ON helix_steps FOR UPDATE
  USING (is_project_member(project_id));

-- Service role full access
CREATE POLICY "Service role full access on helix_steps"
  ON helix_steps FOR ALL
  USING (auth.role() = 'service_role');

-- Table comment
COMMENT ON TABLE helix_steps IS 'Tracks progression through Helix Mode steps with evidence and audit trail';

-- Auto-update updated_at trigger
CREATE TRIGGER helix_steps_updated_at
  BEFORE UPDATE ON helix_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
