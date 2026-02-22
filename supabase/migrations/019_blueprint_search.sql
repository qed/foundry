-- Phase 055: Blueprint Search & Filter
-- Adds full-text search support to blueprints table

-- Add tsvector column for full-text search
ALTER TABLE blueprints ADD COLUMN IF NOT EXISTS search_tsvector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_blueprints_search_tsvector
ON blueprints USING GIN(search_tsvector);

-- Function to update search_tsvector on INSERT/UPDATE
-- Indexes title (A weight = highest priority) and content text (B weight)
CREATE OR REPLACE FUNCTION update_blueprints_search_tsvector()
RETURNS TRIGGER AS $$
DECLARE
  content_text text := '';
BEGIN
  -- Extract text from JSONB content (handles TipTap JSON and Mermaid content)
  IF NEW.content IS NOT NULL THEN
    -- For TipTap content, extract all text nodes
    -- For Mermaid diagrams, extract the code field
    content_text := coalesce(
      -- Try to get Mermaid code first
      NEW.content->>'code',
      -- Otherwise extract text content recursively from JSONB
      regexp_replace(
        NEW.content::text,
        '["{}\\[\\],:]',
        ' ',
        'g'
      )
    );
    -- Clean up: remove JSON keys and keep meaningful text
    content_text := regexp_replace(content_text, '\b(type|content|text|attrs|marks)\b', '', 'gi');
  END IF;

  NEW.search_tsvector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_text, '')), 'B');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector on insert/update
DROP TRIGGER IF EXISTS blueprints_search_tsvector_trigger ON blueprints;
CREATE TRIGGER blueprints_search_tsvector_trigger
BEFORE INSERT OR UPDATE OF title, content ON blueprints
FOR EACH ROW
EXECUTE FUNCTION update_blueprints_search_tsvector();

-- Backfill existing blueprints
UPDATE blueprints SET search_tsvector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(
    content->>'code',
    regexp_replace(
      regexp_replace(content::text, '["{}\\[\\],:]', ' ', 'g'),
      '\b(type|content|text|attrs|marks)\b', '', 'gi'
    )
  , '')), 'B')
WHERE search_tsvector IS NULL;

-- Add index on created_by for author filtering
CREATE INDEX IF NOT EXISTS idx_blueprints_created_by ON blueprints(created_by);

-- Add composite index for common filter patterns
CREATE INDEX IF NOT EXISTS idx_blueprints_project_type_status
ON blueprints(project_id, blueprint_type, status);
