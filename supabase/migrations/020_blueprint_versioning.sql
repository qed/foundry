-- Phase 059: Blueprint Versioning
-- Adds versioning metadata columns and descending index to blueprint_versions

-- Add change_note and trigger_type columns
ALTER TABLE public.blueprint_versions
  ADD COLUMN IF NOT EXISTS change_note TEXT,
  ADD COLUMN IF NOT EXISTS trigger_type TEXT;

-- CHECK constraint for trigger_type values
ALTER TABLE public.blueprint_versions
  ADD CONSTRAINT blueprint_versions_trigger_type_check
  CHECK (trigger_type IS NULL OR trigger_type IN ('edit', 'status_change', 'ai_generated', 'ai_review', 'restore'));

-- Descending composite index for efficient version listing (newest first)
CREATE INDEX IF NOT EXISTS idx_blueprint_versions_blueprint_desc
  ON public.blueprint_versions (blueprint_id, version_number DESC);

-- Drop old basic index if it exists (replaced by more specific descending index)
DROP INDEX IF EXISTS public.idx_blueprint_versions_blueprint_id;
