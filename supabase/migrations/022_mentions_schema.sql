-- Phase 106: @Mentions System
-- Tracks mentions of users and entities in comments

CREATE TABLE public.mention_references (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  comment_id        UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_type    VARCHAR(50) NOT NULL CHECK (mentioned_type IN ('user', 'requirement_doc', 'blueprint', 'work_order', 'artifact')),
  mentioned_id      UUID NOT NULL,
  mentioned_name    VARCHAR(255) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_mention_references_project ON mention_references(project_id);
CREATE INDEX idx_mention_references_comment ON mention_references(comment_id);
CREATE INDEX idx_mention_references_mentioned ON mention_references(mentioned_type, mentioned_id);
CREATE INDEX idx_mention_references_created_at ON mention_references(created_at DESC);

-- RLS
ALTER TABLE mention_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view mentions"
  ON mention_references FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Project members can insert mentions"
  ON mention_references FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Project members can delete mentions"
  ON mention_references FOR DELETE
  USING (is_project_member(project_id));
