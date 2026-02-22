-- ============================================================
-- Phase 054: Blueprint Activities
-- Tracks blueprint lifecycle events: creation, status changes, content updates
-- ============================================================

-- 1. Blueprint Activities table
CREATE TABLE blueprint_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'status_changed', 'content_updated', 'reviewed', 'commented')),
  action_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX idx_blueprint_activities_blueprint ON blueprint_activities(blueprint_id, created_at DESC);
CREATE INDEX idx_blueprint_activities_user ON blueprint_activities(user_id);

-- 3. RLS
ALTER TABLE blueprint_activities ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper for blueprint project membership
CREATE OR REPLACE FUNCTION blueprint_activity_project_member(p_blueprint_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blueprints b
    INNER JOIN project_members pm ON b.project_id = pm.project_id
    WHERE b.id = p_blueprint_id
    AND pm.user_id = p_user_id
  );
$$;

-- SELECT: project members can view activities
CREATE POLICY blueprint_activities_select ON blueprint_activities
  FOR SELECT USING (blueprint_activity_project_member(blueprint_id, auth.uid()));

-- INSERT: project members can create activities
CREATE POLICY blueprint_activities_insert ON blueprint_activities
  FOR INSERT WITH CHECK (blueprint_activity_project_member(blueprint_id, auth.uid()));

-- No UPDATE or DELETE policies (activities are immutable)
