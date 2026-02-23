-- Phase 133: Priority Scoring for Insights Lab
-- AI-powered priority scoring based on frequency, severity, and context

ALTER TABLE public.feedback_submissions
  ADD COLUMN IF NOT EXISTS priority_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority_tier TEXT NOT NULL DEFAULT 'low'
    CHECK (priority_tier IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS priority_components JSONB,
  ADD COLUMN IF NOT EXISTS priority_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_feedback_priority_score
  ON public.feedback_submissions(project_id, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_priority_tier
  ON public.feedback_submissions(project_id, priority_tier);
