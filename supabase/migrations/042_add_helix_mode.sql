-- Phase 001: Add Helix Mode support to projects table
-- Adds a mode enum column to switch between Open Mode (v1) and Helix Mode (v2)

-- Add mode enum type
CREATE TYPE project_mode AS ENUM ('open', 'helix');

-- Add mode column to projects table
ALTER TABLE projects
ADD COLUMN mode project_mode DEFAULT 'open';

-- Add comment for clarity
COMMENT ON COLUMN projects.mode IS 'Project mode: open = v1 behavior, helix = quality-controlled Helix process';

-- Create index for efficient filtering
CREATE INDEX idx_projects_mode ON projects(mode);
