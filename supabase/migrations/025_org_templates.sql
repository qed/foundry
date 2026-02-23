-- Phase 126: Org-Level Blueprint Templates enhancements
-- Adds category, description, is_archived, created_by, updated_at to blueprint_templates
-- Adds template_id to blueprints for usage tracking

-- =============================================================================
-- STEP 1: ADD NEW COLUMNS TO blueprint_templates
-- =============================================================================

ALTER TABLE public.blueprint_templates
  ADD COLUMN description TEXT,
  ADD COLUMN category TEXT CHECK (category IS NULL OR category IN ('architecture', 'api', 'database', 'feature', 'devops', 'security', 'general')),
  ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- =============================================================================
-- STEP 2: ADD template_id TO blueprints FOR USAGE TRACKING
-- =============================================================================

ALTER TABLE public.blueprints
  ADD COLUMN template_id UUID REFERENCES public.blueprint_templates(id) ON DELETE SET NULL;

-- =============================================================================
-- STEP 3: INDEXES
-- =============================================================================

CREATE INDEX idx_blueprint_templates_archived ON public.blueprint_templates(org_id, is_archived);
CREATE INDEX idx_blueprint_templates_category ON public.blueprint_templates(org_id, category);
CREATE INDEX idx_blueprints_template_id ON public.blueprints(template_id) WHERE template_id IS NOT NULL;

-- =============================================================================
-- STEP 4: AUTO-UPDATE TRIGGER FOR updated_at
-- =============================================================================

CREATE TRIGGER update_blueprint_templates_updated_at
  BEFORE UPDATE ON public.blueprint_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
