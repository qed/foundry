-- Phase 127: Extraction Strategy Config
-- Add extraction strategy columns to projects table

ALTER TABLE projects ADD COLUMN extraction_strategy TEXT
  CHECK (extraction_strategy IN ('feature-slice', 'specialist', 'custom'))
  DEFAULT 'feature-slice';

ALTER TABLE projects ADD COLUMN extraction_instructions TEXT;

ALTER TABLE projects ADD COLUMN extraction_strategy_updated_at TIMESTAMPTZ;
