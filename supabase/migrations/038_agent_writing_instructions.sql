-- Phase 122: Agent Writing Instructions
-- Adds custom writing instructions column to projects table for Pattern Shop agent

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS agent_writing_instructions TEXT,
  ADD COLUMN IF NOT EXISTS agent_writing_instructions_updated_at TIMESTAMPTZ;
