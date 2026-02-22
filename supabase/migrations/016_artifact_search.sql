-- Phase 100: Artifact Search & Indexing
-- Adds processing_status, search_vector with GIN index, and tsvector trigger to artifacts table

-- =============================================================================
-- STEP 1: ADD COLUMNS
-- =============================================================================

-- processing_status tracks text extraction state
ALTER TABLE public.artifacts
ADD COLUMN processing_status VARCHAR(20) DEFAULT 'complete',
ADD CONSTRAINT processing_status_enum
  CHECK (processing_status IN ('pending', 'extracting_text', 'complete', 'failed'));

-- search_vector for full-text search (combines name + content_text)
ALTER TABLE public.artifacts
ADD COLUMN search_vector TSVECTOR;

-- =============================================================================
-- STEP 2: GIN INDEX FOR FAST FULL-TEXT SEARCH
-- =============================================================================

CREATE INDEX idx_artifacts_search_vector ON public.artifacts USING GIN(search_vector);

-- =============================================================================
-- STEP 3: TRIGGER FUNCTION TO AUTO-UPDATE TSVECTOR
-- =============================================================================

CREATE OR REPLACE FUNCTION update_artifacts_tsvector()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content_text IS NOT NULL THEN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.content_text, ''));
  ELSE
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artifacts_tsvector_update
BEFORE INSERT OR UPDATE ON public.artifacts
FOR EACH ROW
EXECUTE FUNCTION update_artifacts_tsvector();

-- =============================================================================
-- STEP 4: BACKFILL EXISTING ARTIFACTS
-- =============================================================================

-- Update existing rows to populate search_vector from name
UPDATE public.artifacts
SET search_vector = to_tsvector('english', COALESCE(name, ''))
WHERE search_vector IS NULL;
