-- Phase 099: Artifact-Entity Linking
-- Polymorphic linking table connecting artifacts to any entity type

CREATE TABLE artifact_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artifact_id, entity_type, entity_id),
  CHECK (entity_type IN ('idea', 'feature', 'blueprint', 'work_order', 'feedback'))
);

CREATE INDEX idx_artifact_entity_links_artifact ON artifact_entity_links(artifact_id);
CREATE INDEX idx_artifact_entity_links_entity ON artifact_entity_links(entity_type, entity_id);
CREATE INDEX idx_artifact_entity_links_created_by ON artifact_entity_links(created_by);

-- RLS
ALTER TABLE artifact_entity_links ENABLE ROW LEVEL SECURITY;

-- Members of the artifact's project can view links
CREATE POLICY "artifact_entity_links_select"
  ON artifact_entity_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artifacts a
      JOIN project_members pm ON pm.project_id = a.project_id
      WHERE a.id = artifact_entity_links.artifact_id
        AND pm.user_id = auth.uid()
    )
  );

-- Members can create links
CREATE POLICY "artifact_entity_links_insert"
  ON artifact_entity_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM artifacts a
      JOIN project_members pm ON pm.project_id = a.project_id
      WHERE a.id = artifact_entity_links.artifact_id
        AND pm.user_id = auth.uid()
    )
  );

-- Creator or project leaders can delete links
CREATE POLICY "artifact_entity_links_delete"
  ON artifact_entity_links FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM artifacts a
      JOIN project_members pm ON pm.project_id = a.project_id
      WHERE a.id = artifact_entity_links.artifact_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'leader'
    )
  );
