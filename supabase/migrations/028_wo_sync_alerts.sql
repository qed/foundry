-- Phase 130: Work Order Sync Alerts
-- Adds source_blueprint_id to work_orders and creates wo_sync_alerts table.

-- 1. Add source_blueprint_id to work_orders so we can track which blueprint spawned each WO
ALTER TABLE work_orders
  ADD COLUMN source_blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL;

CREATE INDEX idx_work_orders_source_blueprint ON work_orders(source_blueprint_id)
  WHERE source_blueprint_id IS NOT NULL;

-- 2. Create wo_sync_alerts table
CREATE TABLE wo_sync_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('content_changed', 'requirements_changed', 'acceptance_criteria_changed')),
  change_summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_wo_sync_alerts_work_order ON wo_sync_alerts(work_order_id);
CREATE INDEX idx_wo_sync_alerts_blueprint ON wo_sync_alerts(blueprint_id);
CREATE INDEX idx_wo_sync_alerts_status ON wo_sync_alerts(status) WHERE status != 'resolved';
CREATE INDEX idx_wo_sync_alerts_project ON wo_sync_alerts(project_id);

-- Auto-update trigger for updated_at
CREATE TRIGGER set_wo_sync_alerts_updated_at
  BEFORE UPDATE ON wo_sync_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE wo_sync_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view sync alerts"
  ON wo_sync_alerts FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Project members can insert sync alerts"
  ON wo_sync_alerts FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Project members can update sync alerts"
  ON wo_sync_alerts FOR UPDATE
  USING (is_project_member(project_id));
