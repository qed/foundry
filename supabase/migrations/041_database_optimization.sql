-- Phase 142: Database Indexing & Query Tuning
-- Adds composite and partial indexes for common query patterns

-- ============================================================
-- Composite indexes for common filter + sort patterns
-- ============================================================

-- Ideas: filter by project + status + sort by created_at (Hall inbox)
CREATE INDEX IF NOT EXISTS idx_ideas_project_status_created
  ON ideas(project_id, status, created_at DESC);

-- Ideas: active (non-archived) ideas per project
CREATE INDEX IF NOT EXISTS idx_ideas_active
  ON ideas(project_id, created_at DESC)
  WHERE status != 'archived';

-- Feature nodes: active nodes per project (soft-delete aware)
CREATE INDEX IF NOT EXISTS idx_feature_nodes_active
  ON feature_nodes(project_id, parent_id, position)
  WHERE deleted_at IS NULL;

-- Work orders: project + status + priority (kanban board queries)
CREATE INDEX IF NOT EXISTS idx_work_orders_project_status_priority
  ON work_orders(project_id, status, priority);

-- Work orders: assignee lookup within project
CREATE INDEX IF NOT EXISTS idx_work_orders_project_assignee
  ON work_orders(project_id, assignee_id)
  WHERE assignee_id IS NOT NULL;

-- Blueprints: project + type + status (Control Room filtering)
CREATE INDEX IF NOT EXISTS idx_blueprints_project_type_status
  ON blueprints(project_id, blueprint_type, status);

-- Feedback: project + category + status (Lab filtering)
CREATE INDEX IF NOT EXISTS idx_feedback_project_category_status
  ON feedback_submissions(project_id, category, status);

-- Comments: entity lookup with sort (thread loading)
CREATE INDEX IF NOT EXISTS idx_comments_entity_created
  ON comments(entity_type, entity_id, created_at ASC)
  WHERE deleted_at IS NULL;

-- Activity log: recent activity per entity (timeline)
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_created
  ON activity_log(entity_type, entity_id, created_at DESC);

-- ============================================================
-- Full-text search indexes (GIN)
-- ============================================================

-- Ideas: search by title and body
CREATE INDEX IF NOT EXISTS idx_ideas_fulltext
  ON ideas USING GIN (to_tsvector('english', title || ' ' || COALESCE(body, '')));

-- Work orders: search by title and description
CREATE INDEX IF NOT EXISTS idx_work_orders_fulltext
  ON work_orders USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Feature nodes: search by title and description
CREATE INDEX IF NOT EXISTS idx_feature_nodes_fulltext
  ON feature_nodes USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Blueprints: search by title
CREATE INDEX IF NOT EXISTS idx_blueprints_fulltext
  ON blueprints USING GIN (to_tsvector('english', title));

-- Feedback: search by content
CREATE INDEX IF NOT EXISTS idx_feedback_fulltext
  ON feedback_submissions USING GIN (to_tsvector('english', content));

-- Artifacts: search by name
CREATE INDEX IF NOT EXISTS idx_artifacts_fulltext
  ON artifacts USING GIN (to_tsvector('english', name));

-- ============================================================
-- Entity connections: bidirectional lookup
-- ============================================================

-- Connection pair uniqueness (prevent duplicate connections)
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_connections_unique_pair
  ON entity_connections(
    project_id,
    LEAST(source_type || ':' || source_id, target_type || ':' || target_id),
    GREATEST(source_type || ':' || source_id, target_type || ':' || target_id),
    connection_type
  );

-- ============================================================
-- Update table statistics for query planner
-- ============================================================

ANALYZE ideas;
ANALYZE feature_nodes;
ANALYZE work_orders;
ANALYZE blueprints;
ANALYZE feedback_submissions;
ANALYZE comments;
ANALYZE activity_log;
ANALYZE entity_connections;
ANALYZE artifacts;
