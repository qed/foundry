-- Phase 121: Idea Maturity Scoring
-- Adds maturity scoring columns and view tracking to ideas table

ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS maturity_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maturity_tier TEXT NOT NULL DEFAULT 'raw'
    CHECK (maturity_tier IN ('raw', 'developing', 'mature')),
  ADD COLUMN IF NOT EXISTS maturity_completeness INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maturity_engagement INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maturity_age INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maturity_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Index for sorting/filtering by maturity
CREATE INDEX IF NOT EXISTS idx_ideas_maturity_score ON public.ideas (project_id, maturity_score DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_maturity_tier ON public.ideas (project_id, maturity_tier);
