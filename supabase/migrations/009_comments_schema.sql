-- Phase 105: Comments System Foundation Schema
-- Tables: comments
-- With RLS policies, indexes, and triggers
--
-- Polymorphic commenting system supporting all entity types across modules.
-- Threaded replies via self-referencing parent_comment_id.
-- Soft delete via deleted_at. Resolution tracking on root comments.
-- Anchored comments store text selection data in anchor_data JSONB.

-- =============================================================================
-- STEP 1: CREATE TABLE
-- =============================================================================

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('idea', 'feature_node', 'requirement_doc', 'blueprint', 'work_order', 'feedback')),
  entity_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  anchor_data JSONB,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- =============================================================================
-- STEP 2: HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- =============================================================================

-- Check if the current user is a member of the project that owns a given comment.
-- Used if future junction tables reference comments.
CREATE OR REPLACE FUNCTION comment_project_member(check_comment_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM comments c
    INNER JOIN project_members pm ON pm.project_id = c.project_id
    WHERE c.id = check_comment_id AND pm.user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================================================
-- STEP 3: INDEXES
-- =============================================================================

CREATE INDEX idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX idx_comments_project ON public.comments(project_id);
CREATE INDEX idx_comments_author ON public.comments(author_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX idx_comments_project_entity ON public.comments(project_id, entity_type, entity_id);

-- =============================================================================
-- STEP 4: ENABLE RLS
-- =============================================================================

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: RLS POLICIES
-- =============================================================================

-- comments: project members can CRUD comments
-- Author-only edit/delete and resolution permissions enforced in API routes
CREATE POLICY comments_select_policy
  ON public.comments FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY comments_insert_policy
  ON public.comments FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY comments_update_policy
  ON public.comments FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY comments_delete_policy
  ON public.comments FOR DELETE
  USING (is_project_member(project_id));

-- =============================================================================
-- STEP 6: TRIGGERS (auto-update updated_at)
-- =============================================================================

-- Reuses existing update_updated_at() function from migration 001

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
