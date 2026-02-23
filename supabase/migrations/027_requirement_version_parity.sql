--
-- Phase 102: Document Version History — Requirement version parity with blueprints
-- Adds trigger_type and change_note columns, plus descending composite index
--

-- Add trigger_type to track how versions are created (matches blueprint_versions pattern)
ALTER TABLE public.requirement_versions
ADD COLUMN IF NOT EXISTS trigger_type TEXT CHECK (trigger_type IN ('edit', 'ai_generated', 'restore', 'import'));

-- Add change_note for user-provided annotations
ALTER TABLE public.requirement_versions
ADD COLUMN IF NOT EXISTS change_note TEXT;

-- Add descending composite index for efficient newest-first listing (matches blueprint pattern)
CREATE INDEX IF NOT EXISTS idx_requirement_versions_doc_desc
  ON public.requirement_versions(requirement_doc_id, version_number DESC);

-- Add content_length computed column alternative: store content length for list view optimization
-- (Avoids sending full content in list responses)
