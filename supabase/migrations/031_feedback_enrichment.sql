-- Phase 092: Feedback Enrichment
-- Adds JSONB column for storing AI-generated enrichment data

ALTER TABLE public.feedback_submissions
  ADD COLUMN enrichment JSONB;

-- Index for querying enriched vs non-enriched feedback
CREATE INDEX idx_feedback_enrichment_not_null
  ON public.feedback_submissions (project_id)
  WHERE enrichment IS NOT NULL;
