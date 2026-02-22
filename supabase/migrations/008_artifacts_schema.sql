-- Phase 096: Artifacts Database & Storage Schema
-- Tables: artifact_folders, artifacts
-- With RLS policies, indexes, and triggers
--
-- Artifacts are files uploaded by users (PDFs, images, docs, etc.)
-- organized in a folder hierarchy within each project.
-- The Supabase Storage bucket configuration is handled in the
-- Supabase dashboard or via subsequent phases.

-- =============================================================================
-- STEP 1: CREATE ALL TABLES
-- =============================================================================

-- artifact_folders created first since artifacts references it
CREATE TABLE public.artifact_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES public.artifact_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, parent_folder_id, name)
);

CREATE TABLE public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.artifact_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  content_text TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- STEP 2: HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- =============================================================================

-- Check if the current user is a member of the project that owns a given artifact.
-- Used by artifact_entity_links RLS (future Phase 099) if needed.
CREATE OR REPLACE FUNCTION artifact_project_member(check_artifact_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM artifacts a
    INNER JOIN project_members pm ON pm.project_id = a.project_id
    WHERE a.id = check_artifact_id AND pm.user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================================================
-- STEP 3: INDEXES
-- =============================================================================

CREATE INDEX idx_artifact_folders_project ON public.artifact_folders(project_id);
CREATE INDEX idx_artifact_folders_parent ON public.artifact_folders(parent_folder_id);

CREATE INDEX idx_artifacts_project ON public.artifacts(project_id);
CREATE INDEX idx_artifacts_folder ON public.artifacts(folder_id);
CREATE INDEX idx_artifacts_uploaded_by ON public.artifacts(uploaded_by);
CREATE INDEX idx_artifacts_created_at ON public.artifacts(created_at DESC);
CREATE INDEX idx_artifacts_file_type ON public.artifacts(file_type);

-- =============================================================================
-- STEP 4: ENABLE RLS
-- =============================================================================

ALTER TABLE public.artifact_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: RLS POLICIES
-- =============================================================================

-- artifact_folders: project members can CRUD folders
CREATE POLICY artifact_folders_select_policy
  ON public.artifact_folders FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY artifact_folders_insert_policy
  ON public.artifact_folders FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY artifact_folders_update_policy
  ON public.artifact_folders FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY artifact_folders_delete_policy
  ON public.artifact_folders FOR DELETE
  USING (is_project_member(project_id));

-- artifacts: project members can CRUD artifacts
-- Role-based restrictions (owner or leader for delete) enforced in API routes
CREATE POLICY artifacts_select_policy
  ON public.artifacts FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY artifacts_insert_policy
  ON public.artifacts FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY artifacts_update_policy
  ON public.artifacts FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY artifacts_delete_policy
  ON public.artifacts FOR DELETE
  USING (is_project_member(project_id));

-- =============================================================================
-- STEP 6: TRIGGERS (auto-update updated_at)
-- =============================================================================

-- Reuses existing update_updated_at() function from migration 001

CREATE TRIGGER artifact_folders_updated_at
  BEFORE UPDATE ON public.artifact_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER artifacts_updated_at
  BEFORE UPDATE ON public.artifacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
