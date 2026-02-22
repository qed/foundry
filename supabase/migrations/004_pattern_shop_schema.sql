-- Phase 026: Pattern Shop Database Schema
-- Tables: feature_nodes, requirements_documents, requirement_versions
-- With RLS policies, indexes, helper functions, and triggers
--
-- Follows the same patterns as Hall schema (migration 003):
--   - CHECK constraints instead of CREATE TYPE enums
--   - is_project_member() SECURITY DEFINER for direct project tables
--   - Custom SECURITY DEFINER helpers for indirect-access tables
--   - RLS for tenant isolation only; role-based logic in API routes

-- =============================================================================
-- STEP 1: CREATE ALL TABLES
-- =============================================================================

CREATE TABLE public.feature_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.feature_nodes(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level TEXT NOT NULL CHECK (level IN ('epic', 'feature', 'sub_feature', 'task')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete', 'blocked')),
  position INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- Prevent duplicate sibling titles (non-root nodes)
  UNIQUE(project_id, parent_id, title),

  -- Level progression: epics must be root, others must have a parent
  CONSTRAINT valid_level_progression CHECK (
    CASE
      WHEN level = 'epic' THEN parent_id IS NULL
      ELSE parent_id IS NOT NULL
    END
  )
);

-- Prevent duplicate root-level titles within a project
-- (UNIQUE constraint doesn't catch NULL parent_id duplicates)
CREATE UNIQUE INDEX idx_feature_nodes_unique_root_title
  ON public.feature_nodes(project_id, title)
  WHERE parent_id IS NULL;

CREATE TABLE public.requirements_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  feature_node_id UUID REFERENCES public.feature_nodes(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('product_overview', 'feature_requirement', 'technical_requirement')),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one document of each type per feature node
  UNIQUE(feature_node_id, doc_type),

  -- Feature-linked docs must be feature_requirement; standalone docs must not be
  CONSTRAINT feature_link_validation CHECK (
    (feature_node_id IS NOT NULL AND doc_type = 'feature_requirement') OR
    (feature_node_id IS NULL AND doc_type IN ('product_overview', 'technical_requirement'))
  )
);

CREATE TABLE public.requirement_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_doc_id UUID NOT NULL REFERENCES public.requirements_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary VARCHAR(500),

  UNIQUE(requirement_doc_id, version_number),
  CONSTRAINT valid_version_number CHECK (version_number > 0)
);

-- =============================================================================
-- STEP 2: HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- =============================================================================

-- Check if the current user is a member of the project that owns a given
-- requirements document. Used by requirement_versions RLS policies.
CREATE OR REPLACE FUNCTION requirement_doc_project_member(check_doc_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM requirements_documents rd
    INNER JOIN project_members pm ON pm.project_id = rd.project_id
    WHERE rd.id = check_doc_id AND pm.user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================================================
-- STEP 3: INDEXES
-- =============================================================================

CREATE INDEX idx_feature_nodes_project_id ON public.feature_nodes(project_id);
CREATE INDEX idx_feature_nodes_parent_id ON public.feature_nodes(parent_id);
CREATE INDEX idx_feature_nodes_project_parent ON public.feature_nodes(project_id, parent_id);
CREATE INDEX idx_feature_nodes_status ON public.feature_nodes(status);
CREATE INDEX idx_feature_nodes_deleted_at ON public.feature_nodes(deleted_at);

CREATE INDEX idx_requirements_documents_project_id ON public.requirements_documents(project_id);
CREATE INDEX idx_requirements_documents_feature_node_id ON public.requirements_documents(feature_node_id);
CREATE INDEX idx_requirements_documents_doc_type ON public.requirements_documents(doc_type);

CREATE INDEX idx_requirement_versions_requirement_doc_id ON public.requirement_versions(requirement_doc_id);
CREATE INDEX idx_requirement_versions_created_at ON public.requirement_versions(created_at);

-- =============================================================================
-- STEP 4: ENABLE RLS
-- =============================================================================

ALTER TABLE public.feature_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_versions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: RLS POLICIES
-- =============================================================================

-- feature_nodes: project members can CRUD nodes in their projects
-- Uses is_project_member() from migration 002 to avoid RLS recursion
CREATE POLICY feature_nodes_select_policy
  ON public.feature_nodes FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY feature_nodes_insert_policy
  ON public.feature_nodes FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY feature_nodes_update_policy
  ON public.feature_nodes FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY feature_nodes_delete_policy
  ON public.feature_nodes FOR DELETE
  USING (is_project_member(project_id));

-- requirements_documents: project members can CRUD documents in their projects
CREATE POLICY requirements_documents_select_policy
  ON public.requirements_documents FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY requirements_documents_insert_policy
  ON public.requirements_documents FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY requirements_documents_update_policy
  ON public.requirements_documents FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY requirements_documents_delete_policy
  ON public.requirements_documents FOR DELETE
  USING (is_project_member(project_id));

-- requirement_versions: access inherited through document's project membership
-- Uses requirement_doc_project_member() SECURITY DEFINER to avoid RLS chain issues
CREATE POLICY requirement_versions_select_policy
  ON public.requirement_versions FOR SELECT
  USING (requirement_doc_project_member(requirement_doc_id));

CREATE POLICY requirement_versions_insert_policy
  ON public.requirement_versions FOR INSERT
  WITH CHECK (requirement_doc_project_member(requirement_doc_id));

-- Versions are immutable — no UPDATE or DELETE policies

-- =============================================================================
-- STEP 6: TRIGGERS (auto-update updated_at)
-- =============================================================================

-- Reuses existing update_updated_at() function from migration 001

CREATE TRIGGER feature_nodes_updated_at
  BEFORE UPDATE ON public.feature_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER requirements_documents_updated_at
  BEFORE UPDATE ON public.requirements_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
