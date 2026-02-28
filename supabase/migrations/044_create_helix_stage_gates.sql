-- Phase 001: Create helix_stage_gates table
-- Enforces hard-block progression between Helix stages

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

-- Indexes for efficient queries
CREATE INDEX idx_helix_stage_gates_project_id ON helix_stage_gates(project_id);
CREATE INDEX idx_helix_stage_gates_stage_number ON helix_stage_gates(stage_number);
CREATE INDEX idx_helix_stage_gates_status ON helix_stage_gates(status);
CREATE INDEX idx_helix_stage_gates_project_stage ON helix_stage_gates(project_id, stage_number);

-- Enable RLS
ALTER TABLE helix_stage_gates ENABLE ROW LEVEL SECURITY;

-- RLS Policies using existing is_project_member() SECURITY DEFINER helper
CREATE POLICY "Project members can read helix stage gates"
  ON helix_stage_gates FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Project members can insert helix stage gates"
  ON helix_stage_gates FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Project members can update helix stage gates"
  ON helix_stage_gates FOR UPDATE
  USING (is_project_member(project_id));

-- Service role full access
CREATE POLICY "Service role full access on helix_stage_gates"
  ON helix_stage_gates FOR ALL
  USING (auth.role() = 'service_role');

-- Table comment
COMMENT ON TABLE helix_stage_gates IS 'Tracks stage gate status to enforce linear progression through Helix stages';

-- Auto-update updated_at trigger
CREATE TRIGGER helix_stage_gates_updated_at
  BEFORE UPDATE ON helix_stage_gates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
