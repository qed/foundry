-- Phase 011: Hall Database Schema
-- Tables: ideas, tags, idea_tags, idea_connections, agent_conversations
-- With RLS policies, indexes, helper functions, and triggers
--
-- Note: ideas.promoted_to_seed_id is a nullable UUID column. The FK constraint
-- to pattern_seeds will be added when the Pattern Shop schema is created.

-- =============================================================================
-- STEP 1: CREATE ALL TABLES
-- =============================================================================

CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'raw' CHECK (status IN ('raw', 'developing', 'mature', 'promoted', 'archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  promoted_to_seed_id UUID
);

CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#808080',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE TABLE public.idea_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(idea_id, tag_id)
);

CREATE TABLE public.idea_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  target_idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL DEFAULT 'related' CHECK (connection_type IN ('related', 'duplicates', 'extends')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_idea_id, target_idea_id, connection_type)
);

CREATE TABLE public.agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  module TEXT NOT NULL DEFAULT 'hall',
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- STEP 2: HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- =============================================================================

-- Check if the current user is a member of the project that owns a given idea.
-- Used by idea_tags and idea_connections RLS policies (indirect project access).
CREATE OR REPLACE FUNCTION idea_project_member(check_idea_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM ideas i
    INNER JOIN project_members pm ON pm.project_id = i.project_id
    WHERE i.id = check_idea_id AND pm.user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================================================
-- STEP 3: INDEXES
-- =============================================================================

CREATE INDEX idx_ideas_project_id ON public.ideas(project_id);
CREATE INDEX idx_ideas_created_by ON public.ideas(created_by);
CREATE INDEX idx_ideas_status ON public.ideas(status);

CREATE INDEX idx_tags_project_id ON public.tags(project_id);

CREATE INDEX idx_idea_tags_idea_id ON public.idea_tags(idea_id);
CREATE INDEX idx_idea_tags_tag_id ON public.idea_tags(tag_id);

CREATE INDEX idx_idea_connections_source ON public.idea_connections(source_idea_id);
CREATE INDEX idx_idea_connections_target ON public.idea_connections(target_idea_id);

CREATE INDEX idx_agent_conversations_project_id ON public.agent_conversations(project_id);

-- =============================================================================
-- STEP 4: ENABLE RLS
-- =============================================================================

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: RLS POLICIES
-- =============================================================================

-- ideas: project members can CRUD ideas in their projects
-- Uses is_project_member() from migration 002 to avoid RLS recursion
CREATE POLICY ideas_select_policy
  ON public.ideas FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY ideas_insert_policy
  ON public.ideas FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY ideas_update_policy
  ON public.ideas FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY ideas_delete_policy
  ON public.ideas FOR DELETE
  USING (is_project_member(project_id));

-- tags: project members can CRUD tags in their projects
CREATE POLICY tags_select_policy
  ON public.tags FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY tags_insert_policy
  ON public.tags FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY tags_update_policy
  ON public.tags FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY tags_delete_policy
  ON public.tags FOR DELETE
  USING (is_project_member(project_id));

-- idea_tags: access inherited through idea's project membership
-- Uses idea_project_member() SECURITY DEFINER to avoid RLS chain issues
CREATE POLICY idea_tags_select_policy
  ON public.idea_tags FOR SELECT
  USING (idea_project_member(idea_id));

CREATE POLICY idea_tags_insert_policy
  ON public.idea_tags FOR INSERT
  WITH CHECK (idea_project_member(idea_id));

CREATE POLICY idea_tags_delete_policy
  ON public.idea_tags FOR DELETE
  USING (idea_project_member(idea_id));

-- idea_connections: access inherited through source idea's project membership
-- Uses idea_project_member() SECURITY DEFINER to avoid RLS chain issues
CREATE POLICY idea_connections_select_policy
  ON public.idea_connections FOR SELECT
  USING (idea_project_member(source_idea_id));

CREATE POLICY idea_connections_insert_policy
  ON public.idea_connections FOR INSERT
  WITH CHECK (idea_project_member(source_idea_id));

CREATE POLICY idea_connections_delete_policy
  ON public.idea_connections FOR DELETE
  USING (idea_project_member(source_idea_id));

-- agent_conversations: project members can read/write conversations
CREATE POLICY agent_conversations_select_policy
  ON public.agent_conversations FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY agent_conversations_insert_policy
  ON public.agent_conversations FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY agent_conversations_update_policy
  ON public.agent_conversations FOR UPDATE
  USING (is_project_member(project_id));

-- =============================================================================
-- STEP 6: TRIGGERS (auto-update updated_at)
-- =============================================================================

-- Reuses existing update_updated_at() function from migration 001

CREATE TRIGGER ideas_updated_at
  BEFORE UPDATE ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agent_conversations_updated_at
  BEFORE UPDATE ON public.agent_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
