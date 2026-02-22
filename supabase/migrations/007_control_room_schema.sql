-- Phase 046: Control Room Database Schema
-- Tables: blueprints, blueprint_versions, blueprint_templates
-- With RLS policies, indexes, helper functions, and triggers
--
-- Note: auto_version_trigger (auto-create version on blueprint update)
-- is deferred to Phase 059 (Blueprint Version History).
-- The work_orders.blueprint_id FK from Phase 061 can be added in a
-- future migration now that this table exists.

-- =============================================================================
-- STEP 1: CREATE ALL TABLES
-- =============================================================================

CREATE TABLE public.blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  feature_node_id UUID REFERENCES public.feature_nodes(id) ON DELETE CASCADE,
  blueprint_type TEXT NOT NULL CHECK (blueprint_type IN ('foundation', 'system_diagram', 'feature')),
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'implemented')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Feature blueprints must have a feature_node_id; others must not
  CONSTRAINT feature_blueprint_requires_feature_node
    CHECK (
      (blueprint_type = 'feature' AND feature_node_id IS NOT NULL) OR
      (blueprint_type != 'feature' AND feature_node_id IS NULL)
    )
);

-- Partial unique: only one blueprint per feature node per project
CREATE UNIQUE INDEX idx_blueprints_unique_feature_node
  ON public.blueprints(project_id, feature_node_id)
  WHERE feature_node_id IS NOT NULL;

CREATE TABLE public.blueprint_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blueprint_id, version_number)
);

CREATE TABLE public.blueprint_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  blueprint_type TEXT NOT NULL CHECK (blueprint_type IN ('foundation', 'system_diagram', 'feature')),
  outline_content JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique: org templates have unique names within an org
CREATE UNIQUE INDEX idx_blueprint_templates_unique_org_name
  ON public.blueprint_templates(org_id, name)
  WHERE org_id IS NOT NULL;

-- Partial unique: only one default system template per blueprint type
CREATE UNIQUE INDEX idx_blueprint_templates_default_per_type
  ON public.blueprint_templates(blueprint_type)
  WHERE is_default = true AND org_id IS NULL;

-- =============================================================================
-- STEP 2: HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- =============================================================================

-- Check if the current user is a member of the project that owns a given blueprint.
-- Used by blueprint_versions RLS policies (indirect project access).
CREATE OR REPLACE FUNCTION blueprint_project_member(check_blueprint_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM blueprints b
    INNER JOIN project_members pm ON pm.project_id = b.project_id
    WHERE b.id = check_blueprint_id AND pm.user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================================================
-- STEP 3: INDEXES
-- =============================================================================

CREATE INDEX idx_blueprints_project_id ON public.blueprints(project_id);
CREATE INDEX idx_blueprints_feature_node_id ON public.blueprints(feature_node_id);
CREATE INDEX idx_blueprints_status ON public.blueprints(status);
CREATE INDEX idx_blueprints_type ON public.blueprints(blueprint_type);

CREATE INDEX idx_blueprint_versions_blueprint_id ON public.blueprint_versions(blueprint_id);

CREATE INDEX idx_blueprint_templates_org_id ON public.blueprint_templates(org_id);
CREATE INDEX idx_blueprint_templates_type ON public.blueprint_templates(blueprint_type);

-- =============================================================================
-- STEP 4: ENABLE RLS
-- =============================================================================

ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_templates ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: RLS POLICIES
-- =============================================================================

-- blueprints: project members can CRUD blueprints
-- Role-based restrictions (leader-only for delete) enforced in API routes
CREATE POLICY blueprints_select_policy
  ON public.blueprints FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY blueprints_insert_policy
  ON public.blueprints FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY blueprints_update_policy
  ON public.blueprints FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY blueprints_delete_policy
  ON public.blueprints FOR DELETE
  USING (is_project_member(project_id));

-- blueprint_versions: access inherited through blueprint's project membership
-- Uses blueprint_project_member() SECURITY DEFINER to avoid RLS chain issues
CREATE POLICY blueprint_versions_select_policy
  ON public.blueprint_versions FOR SELECT
  USING (blueprint_project_member(blueprint_id));

CREATE POLICY blueprint_versions_insert_policy
  ON public.blueprint_versions FOR INSERT
  WITH CHECK (blueprint_project_member(blueprint_id));

-- No UPDATE or DELETE on versions: version history is immutable

-- blueprint_templates: system templates visible to all, org templates to org members
-- Mutation role restrictions (admin-only) enforced in API routes
CREATE POLICY blueprint_templates_select_system_policy
  ON public.blueprint_templates FOR SELECT
  USING (org_id IS NULL);

CREATE POLICY blueprint_templates_select_org_policy
  ON public.blueprint_templates FOR SELECT
  USING (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY blueprint_templates_insert_policy
  ON public.blueprint_templates FOR INSERT
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY blueprint_templates_update_policy
  ON public.blueprint_templates FOR UPDATE
  USING (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY blueprint_templates_delete_policy
  ON public.blueprint_templates FOR DELETE
  USING (org_id IS NOT NULL AND is_org_member(org_id));

-- =============================================================================
-- STEP 6: TRIGGERS (auto-update updated_at)
-- =============================================================================

-- Reuses existing update_updated_at() function from migration 001

CREATE TRIGGER blueprints_updated_at
  BEFORE UPDATE ON public.blueprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
