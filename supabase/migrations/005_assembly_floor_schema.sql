-- Phase 061: Assembly Floor Database Schema
-- Tables: phases, work_orders, work_order_activity
-- With RLS policies, indexes, helper functions, and triggers
--
-- Note: work_orders.blueprint_id is omitted until Phase 046 (Control Room Schema)
-- creates the blueprints table. The FK will be added in that migration.

-- =============================================================================
-- STEP 1: CREATE ALL TABLES
-- =============================================================================

CREATE TABLE public.phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  feature_node_id UUID REFERENCES public.feature_nodes(id) ON DELETE SET NULL,
  phase_id UUID REFERENCES public.phases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  description_json JSONB,
  acceptance_criteria TEXT,
  implementation_plan TEXT,
  implementation_plan_json JSONB,
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'ready', 'in_progress', 'in_review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  position INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.work_order_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- STEP 2: HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- =============================================================================

-- Check if the current user is a member of the project that owns a given work order.
-- Used by work_order_activity RLS policies (indirect project access).
CREATE OR REPLACE FUNCTION work_order_project_member(check_work_order_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM work_orders wo
    INNER JOIN project_members pm ON pm.project_id = wo.project_id
    WHERE wo.id = check_work_order_id AND pm.user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================================================
-- STEP 3: INDEXES
-- =============================================================================

CREATE INDEX idx_phases_project_id ON public.phases(project_id);

CREATE INDEX idx_work_orders_project_id ON public.work_orders(project_id);
CREATE INDEX idx_work_orders_phase_id ON public.work_orders(phase_id);
CREATE INDEX idx_work_orders_assignee_id ON public.work_orders(assignee_id);
CREATE INDEX idx_work_orders_feature_node_id ON public.work_orders(feature_node_id);
CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_priority ON public.work_orders(priority);
CREATE INDEX idx_work_orders_project_phase ON public.work_orders(project_id, phase_id);

CREATE INDEX idx_work_order_activity_work_order_id ON public.work_order_activity(work_order_id);
CREATE INDEX idx_work_order_activity_user_id ON public.work_order_activity(user_id);
CREATE INDEX idx_work_order_activity_created_at ON public.work_order_activity(created_at DESC);

-- =============================================================================
-- STEP 4: ENABLE RLS
-- =============================================================================

ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_activity ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: RLS POLICIES
-- =============================================================================

-- phases: project members can CRUD phases in their projects
CREATE POLICY phases_select_policy
  ON public.phases FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY phases_insert_policy
  ON public.phases FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY phases_update_policy
  ON public.phases FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY phases_delete_policy
  ON public.phases FOR DELETE
  USING (is_project_member(project_id));

-- work_orders: project members can CRUD work orders in their projects
CREATE POLICY work_orders_select_policy
  ON public.work_orders FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY work_orders_insert_policy
  ON public.work_orders FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY work_orders_update_policy
  ON public.work_orders FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY work_orders_delete_policy
  ON public.work_orders FOR DELETE
  USING (is_project_member(project_id));

-- work_order_activity: access inherited through work order's project membership
-- Uses work_order_project_member() SECURITY DEFINER to avoid RLS chain issues
CREATE POLICY work_order_activity_select_policy
  ON public.work_order_activity FOR SELECT
  USING (work_order_project_member(work_order_id));

CREATE POLICY work_order_activity_insert_policy
  ON public.work_order_activity FOR INSERT
  WITH CHECK (work_order_project_member(work_order_id) AND user_id = auth.uid());

-- No UPDATE or DELETE policies on work_order_activity: audit trail is immutable

-- =============================================================================
-- STEP 6: TRIGGERS (auto-update updated_at)
-- =============================================================================

-- Reuses existing update_updated_at() function from migration 001

CREATE TRIGGER phases_updated_at
  BEFORE UPDATE ON public.phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
