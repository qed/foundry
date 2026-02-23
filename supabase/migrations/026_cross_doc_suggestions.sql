-- Phase 125: Cross-Document Suggestions
-- Tables: cross_doc_suggestions, cross_doc_suggestion_items
-- Agent-generated coordinated edits across multiple blueprints

-- =============================================================================
-- STEP 1: TABLES
-- =============================================================================

CREATE TABLE public.cross_doc_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_blueprint_id UUID REFERENCES public.blueprints(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  change_impact TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'applied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE public.cross_doc_suggestion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES public.cross_doc_suggestions(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('edit', 'add_section', 'remove_section')),
  target_section TEXT,
  current_content TEXT,
  proposed_content TEXT,
  reasoning TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- STEP 2: INDEXES
-- =============================================================================

CREATE INDEX idx_cross_doc_suggestions_project ON public.cross_doc_suggestions(project_id, status);
CREATE INDEX idx_cross_doc_suggestions_trigger ON public.cross_doc_suggestions(trigger_blueprint_id) WHERE trigger_blueprint_id IS NOT NULL;
CREATE INDEX idx_cross_doc_suggestions_created ON public.cross_doc_suggestions(project_id, created_at DESC);
CREATE INDEX idx_cross_doc_suggestion_items_suggestion ON public.cross_doc_suggestion_items(suggestion_id);
CREATE INDEX idx_cross_doc_suggestion_items_blueprint ON public.cross_doc_suggestion_items(blueprint_id);

-- =============================================================================
-- STEP 3: ENABLE RLS
-- =============================================================================

ALTER TABLE public.cross_doc_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_doc_suggestion_items ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 4: RLS POLICIES
-- =============================================================================

CREATE POLICY cross_doc_suggestions_select_policy
  ON public.cross_doc_suggestions FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY cross_doc_suggestions_insert_policy
  ON public.cross_doc_suggestions FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY cross_doc_suggestions_update_policy
  ON public.cross_doc_suggestions FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY cross_doc_suggestions_delete_policy
  ON public.cross_doc_suggestions FOR DELETE
  USING (is_project_member(project_id));

-- Items inherit access via suggestion's project membership
CREATE POLICY cross_doc_suggestion_items_select_policy
  ON public.cross_doc_suggestion_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cross_doc_suggestions s
    WHERE s.id = suggestion_id AND is_project_member(s.project_id)
  ));

CREATE POLICY cross_doc_suggestion_items_insert_policy
  ON public.cross_doc_suggestion_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cross_doc_suggestions s
    WHERE s.id = suggestion_id AND is_project_member(s.project_id)
  ));

CREATE POLICY cross_doc_suggestion_items_update_policy
  ON public.cross_doc_suggestion_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.cross_doc_suggestions s
    WHERE s.id = suggestion_id AND is_project_member(s.project_id)
  ));

-- =============================================================================
-- STEP 5: AUTO-UPDATE TRIGGER
-- =============================================================================

CREATE TRIGGER update_cross_doc_suggestions_updated_at
  BEFORE UPDATE ON public.cross_doc_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
