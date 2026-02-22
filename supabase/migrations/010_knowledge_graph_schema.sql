-- Phase 109: Knowledge Graph Schema
-- Tables: entity_connections
-- Views: bidirectional_connections
-- With RLS policies, indexes, and triggers
--
-- Tracks relationships between all entity types across modules.
-- Supports manual and auto-detected connections with metadata.
-- Bidirectional view enables symmetric queries for relates_to,
-- conflicts_with, and complements connection types.

-- =============================================================================
-- STEP 1: CREATE TABLE
-- =============================================================================

CREATE TABLE public.entity_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('idea', 'feature', 'blueprint', 'work_order', 'feedback', 'artifact')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('idea', 'feature', 'blueprint', 'work_order', 'feedback', 'artifact')),
  target_id UUID NOT NULL,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('references', 'depends_on', 'relates_to', 'implements', 'derived_from', 'conflicts_with', 'complements')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_auto_detected BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_type, source_id, target_type, target_id, connection_type)
);

-- =============================================================================
-- STEP 2: VIEW (bidirectional connections for symmetric relationship types)
-- =============================================================================

CREATE VIEW public.bidirectional_connections AS
  SELECT * FROM public.entity_connections
  UNION ALL
  SELECT
    id, project_id,
    target_type AS source_type, target_id AS source_id,
    source_type AS target_type, source_id AS target_id,
    connection_type, created_by, is_auto_detected, metadata,
    created_at, updated_at
  FROM public.entity_connections
  WHERE connection_type IN ('relates_to', 'conflicts_with', 'complements');

-- =============================================================================
-- STEP 3: INDEXES
-- =============================================================================

CREATE INDEX idx_entity_connections_source ON public.entity_connections(source_type, source_id);
CREATE INDEX idx_entity_connections_target ON public.entity_connections(target_type, target_id);
CREATE INDEX idx_entity_connections_project ON public.entity_connections(project_id);
CREATE INDEX idx_entity_connections_created_at ON public.entity_connections(created_at DESC);
CREATE INDEX idx_entity_connections_auto_detected ON public.entity_connections(is_auto_detected);

-- Filtered index for manual connections (most common query path)
CREATE INDEX idx_entity_connections_manual_lookup ON public.entity_connections(
  project_id, source_type, source_id, connection_type
) WHERE is_auto_detected = false;

-- =============================================================================
-- STEP 4: ENABLE RLS
-- =============================================================================

ALTER TABLE public.entity_connections ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: RLS POLICIES
-- =============================================================================

-- entity_connections: project members can CRUD connections
CREATE POLICY entity_connections_select_policy
  ON public.entity_connections FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY entity_connections_insert_policy
  ON public.entity_connections FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY entity_connections_update_policy
  ON public.entity_connections FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY entity_connections_delete_policy
  ON public.entity_connections FOR DELETE
  USING (is_project_member(project_id));

-- =============================================================================
-- STEP 6: TRIGGERS (auto-update updated_at)
-- =============================================================================

-- Reuses existing update_updated_at() function from migration 001

CREATE TRIGGER entity_connections_updated_at
  BEFORE UPDATE ON public.entity_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
