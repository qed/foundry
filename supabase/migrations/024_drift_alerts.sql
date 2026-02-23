-- Phase 124: Drift Detection
-- Tracks when requirements change and blueprints may be out of sync

CREATE TABLE drift_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  requirement_doc_id UUID REFERENCES requirements_documents(id) ON DELETE CASCADE,
  feature_node_id UUID REFERENCES feature_nodes(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('requirement_changed', 'code_changed')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  description TEXT NOT NULL,
  change_summary TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_drift_alerts_project ON drift_alerts(project_id);
CREATE INDEX idx_drift_alerts_blueprint ON drift_alerts(blueprint_id);
CREATE INDEX idx_drift_alerts_status ON drift_alerts(status);
CREATE INDEX idx_drift_alerts_project_status ON drift_alerts(project_id, status);

-- Auto-update trigger for updated_at
CREATE TRIGGER set_drift_alerts_updated_at
  BEFORE UPDATE ON drift_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE drift_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY drift_alerts_select ON drift_alerts
  FOR SELECT USING (is_project_member(project_id));

CREATE POLICY drift_alerts_insert ON drift_alerts
  FOR INSERT WITH CHECK (is_project_member(project_id));

CREATE POLICY drift_alerts_update ON drift_alerts
  FOR UPDATE USING (is_project_member(project_id));

CREATE POLICY drift_alerts_delete ON drift_alerts
  FOR DELETE USING (is_project_member(project_id));
