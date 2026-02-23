-- Phase 091: Auto-Categorization
-- Add AI categorization tracking columns to feedback_submissions

ALTER TABLE public.feedback_submissions
  ADD COLUMN ai_suggested BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN categorization_reasoning TEXT;
