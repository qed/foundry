-- Phase 081: Insights Lab Database Schema
-- Tables: app_keys, feedback_submissions
-- With RLS policies, indexes, helper functions, and triggers
--
-- Note: converted_to_work_order_id references work_orders from Phase 061.
-- converted_to_feature_id references feature_nodes from Phase 026.
-- RLS uses is_project_member() for tenant isolation; role-based
-- authorization (leader vs developer) is enforced in API routes.

-- =============================================================================
-- STEP 1: CREATE ALL TABLES
-- =============================================================================

-- app_keys created first since feedback_submissions references it
CREATE TABLE public.app_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  app_key_id UUID REFERENCES public.app_keys(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  submitter_email TEXT,
  submitter_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'uncategorized' CHECK (category IN ('bug', 'feature_request', 'ux_issue', 'performance', 'other', 'uncategorized')),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  score INT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'converted', 'archived')),
  converted_to_work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  converted_to_feature_id UUID REFERENCES public.feature_nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- STEP 2: HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- =============================================================================

-- Check if a given app key is active. Used by feedback insert policy so
-- external (unauthenticated) submissions can be validated without RLS issues.
CREATE OR REPLACE FUNCTION is_active_app_key(check_app_key_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_keys
    WHERE id = check_app_key_id AND status = 'active'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================================================
-- STEP 3: INDEXES
-- =============================================================================

CREATE INDEX idx_app_keys_project_status ON public.app_keys(project_id, status);

CREATE INDEX idx_feedback_submissions_project_created ON public.feedback_submissions(project_id, created_at DESC);
CREATE INDEX idx_feedback_submissions_project_status ON public.feedback_submissions(project_id, status);
CREATE INDEX idx_feedback_submissions_project_score ON public.feedback_submissions(project_id, score DESC NULLS LAST);
CREATE INDEX idx_feedback_submissions_work_order ON public.feedback_submissions(converted_to_work_order_id);
CREATE INDEX idx_feedback_submissions_feature ON public.feedback_submissions(converted_to_feature_id);
CREATE INDEX idx_feedback_submissions_app_key ON public.feedback_submissions(app_key_id);

-- =============================================================================
-- STEP 4: ENABLE RLS
-- =============================================================================

ALTER TABLE public.app_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: RLS POLICIES
-- =============================================================================

-- app_keys: project members can read/manage keys
-- Role-based restrictions (leader-only for create/update/delete) enforced in API routes
CREATE POLICY app_keys_select_policy
  ON public.app_keys FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY app_keys_insert_policy
  ON public.app_keys FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY app_keys_update_policy
  ON public.app_keys FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY app_keys_delete_policy
  ON public.app_keys FOR DELETE
  USING (is_project_member(project_id));

-- feedback_submissions: project members can read/manage feedback
CREATE POLICY feedback_submissions_select_policy
  ON public.feedback_submissions FOR SELECT
  USING (is_project_member(project_id));

-- Insert: authenticated project members can create feedback manually,
-- OR external submissions come through service client (bypasses RLS).
-- Also allow insert if a valid active app key is provided (for direct Supabase access).
CREATE POLICY feedback_submissions_insert_policy
  ON public.feedback_submissions FOR INSERT
  WITH CHECK (
    is_project_member(project_id)
    OR (app_key_id IS NOT NULL AND is_active_app_key(app_key_id))
  );

CREATE POLICY feedback_submissions_update_policy
  ON public.feedback_submissions FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY feedback_submissions_delete_policy
  ON public.feedback_submissions FOR DELETE
  USING (is_project_member(project_id));

-- =============================================================================
-- STEP 6: TRIGGERS (auto-update updated_at)
-- =============================================================================

-- Reuses existing update_updated_at() function from migration 001

CREATE TRIGGER feedback_submissions_updated_at
  BEFORE UPDATE ON public.feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
