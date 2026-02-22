-- Phase 119: Audit Trail & Activity Log Schema
-- Immutable activity log for tracking all user actions across the platform.

-- =============================================================================
-- TABLE: activity_log
-- =============================================================================

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'idea', 'feature_node', 'requirement_doc', 'blueprint',
    'work_order', 'feedback', 'artifact', 'comment',
    'member', 'project', 'connection', 'tag', 'phase'
  )),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No updated_at — activity log entries are immutable.

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Read: project members can view activity
CREATE POLICY "Project members can read activity log"
  ON public.activity_log FOR SELECT
  USING (is_project_member(project_id));

-- Insert: project members can create entries (via service role in practice)
CREATE POLICY "Project members can insert activity"
  ON public.activity_log FOR INSERT
  WITH CHECK (is_project_member(project_id));

-- No UPDATE or DELETE policies — activity log is immutable.

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_activity_log_project_created
  ON public.activity_log (project_id, created_at DESC);

CREATE INDEX idx_activity_log_user
  ON public.activity_log (user_id);

CREATE INDEX idx_activity_log_entity
  ON public.activity_log (entity_type, entity_id);

CREATE INDEX idx_activity_log_action
  ON public.activity_log (action);

CREATE INDEX idx_activity_log_project_user
  ON public.activity_log (project_id, user_id, created_at DESC);
