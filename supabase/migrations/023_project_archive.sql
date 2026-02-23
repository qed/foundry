-- Phase 120: Project Archive & Cleanup
-- Adds archive columns to projects table for soft-archive functionality

ALTER TABLE projects
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN archived_at TIMESTAMPTZ,
ADD COLUMN archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Indexes for filtering
CREATE INDEX idx_projects_archived ON projects(org_id, is_archived);
CREATE INDEX idx_projects_archived_at ON projects(archived_at DESC) WHERE archived_at IS NOT NULL;
