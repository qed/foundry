# Phase 026 - Pattern Shop Database Schema

## Objective
Establish the complete PostgreSQL schema for The Pattern Shop, including tables for hierarchical feature trees, requirements documents, versions, and RLS policies to ensure team-scoped access control.

## Prerequisites
- PostgreSQL database with Supabase (Phase 001)
- RLS foundations established (Phase 002)
- Project context and user authentication working (Phase 003-010)

## Context
The Pattern Shop operates on a hierarchical decomposition model: Epics are the top-level requirements, Features break down Epics, Sub-features break down Features, and Tasks are the lowest level. Each feature node can have an associated Feature Requirements Document (FRD). The database must support this tree structure with efficient querying, self-referential relationships, and robust version control.

## Detailed Requirements

### Table 1: feature_nodes
Core hierarchical structure for the decomposed feature tree.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `project_id` (UUID, FK → projects.id): Project this node belongs to
- `parent_id` (UUID, FK → feature_nodes.id, nullable): Self-referential for hierarchy. NULL indicates Epic-level nodes
- `title` (VARCHAR(255), NOT NULL): Node name (e.g., "User Authentication", "Email Verification")
- `description` (TEXT, nullable): Extended description of the node
- `level` (ENUM: 'epic', 'feature', 'sub_feature', 'task', NOT NULL): Hierarchical level
- `status` (ENUM: 'not_started', 'in_progress', 'complete', 'blocked', DEFAULT 'not_started'): Current status
- `position` (INT, NOT NULL, DEFAULT 0): Order within siblings (allows reordering without renumbering)
- `created_by` (UUID, FK → auth.users.id): Creator user ID
- `created_at` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW()): Creation timestamp
- `updated_at` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW()): Last update timestamp
- `deleted_at` (TIMESTAMP WITH TIME ZONE, nullable): Soft delete timestamp

**Constraints:**
- UNIQUE(project_id, parent_id, title) at same level to prevent duplicate sibling titles
- CHECK: level progression (epic → feature → sub_feature → task)
- Foreign key on parent_id must reference same table (self-join) and only if parent level < child level

**Indexes:**
- idx_feature_nodes_project_id
- idx_feature_nodes_parent_id
- idx_feature_nodes_project_parent (composite)
- idx_feature_nodes_status
- idx_feature_nodes_deleted_at

### Table 2: requirements_documents
Stores FRDs and technical requirement documents linked to feature nodes or as standalone project documents.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `project_id` (UUID, FK → projects.id, NOT NULL): Project context
- `feature_node_id` (UUID, FK → feature_nodes.id, nullable): Associated feature node. NULL for product overviews and technical docs
- `doc_type` (ENUM: 'product_overview', 'feature_requirement', 'technical_requirement', NOT NULL): Document classification
- `title` (VARCHAR(255), NOT NULL): Document title (e.g., "User Authentication - Feature Requirement")
- `content` (TEXT, NOT NULL, DEFAULT ''): Rich text content (stored as HTML or markdown with formatting)
- `created_by` (UUID, FK → auth.users.id): Document creator
- `created_at` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW()): Creation timestamp
- `updated_at` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW()): Last update timestamp

**Constraints:**
- UNIQUE(feature_node_id, doc_type) to prevent duplicate FRDs per node
- CHECK: if feature_node_id IS NOT NULL then doc_type = 'feature_requirement'

**Indexes:**
- idx_requirements_documents_project_id
- idx_requirements_documents_feature_node_id
- idx_requirements_documents_doc_type

### Table 3: requirement_versions
Immutable version history for all requirements documents.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `requirement_doc_id` (UUID, FK → requirements_documents.id, NOT NULL, ON DELETE CASCADE): Parent document
- `version_number` (INT, NOT NULL): Sequential version (1, 2, 3...)
- `content` (TEXT, NOT NULL): Full document content at this version
- `created_by` (UUID, FK → auth.users.id): Author of this version
- `created_at` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW()): When version was created
- `change_summary` (VARCHAR(500), nullable): User-provided summary of changes

**Constraints:**
- UNIQUE(requirement_doc_id, version_number)
- CHECK: version_number > 0

**Indexes:**
- idx_requirement_versions_requirement_doc_id
- idx_requirement_versions_created_at

## RLS Policies

### feature_nodes
```sql
-- Enable RLS
ALTER TABLE feature_nodes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select nodes in projects they're members of
CREATE POLICY "Users can view nodes in accessible projects"
  ON feature_nodes FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert nodes in projects they're members of with edit permission
CREATE POLICY "Users can create nodes in accessible projects"
  ON feature_nodes FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Policy: Users can update nodes in projects they can edit
CREATE POLICY "Users can update nodes in accessible projects"
  ON feature_nodes FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Policy: Users can delete nodes (soft delete only)
CREATE POLICY "Users can delete nodes in accessible projects"
  ON feature_nodes FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );
```

### requirements_documents
```sql
ALTER TABLE requirements_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in accessible projects"
  ON requirements_documents FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents in accessible projects"
  ON requirements_documents FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can update documents in accessible projects"
  ON requirements_documents FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can delete documents in accessible projects"
  ON requirements_documents FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );
```

### requirement_versions
```sql
ALTER TABLE requirement_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of accessible documents"
  ON requirement_versions FOR SELECT
  USING (
    requirement_doc_id IN (
      SELECT id FROM requirements_documents
      WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create versions in accessible projects"
  ON requirement_versions FOR INSERT
  WITH CHECK (
    requirement_doc_id IN (
      SELECT id FROM requirements_documents
      WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
    )
  );
```

## Database Schema

```sql
-- Create ENUMs
CREATE TYPE feature_level AS ENUM ('epic', 'feature', 'sub_feature', 'task');
CREATE TYPE feature_status AS ENUM ('not_started', 'in_progress', 'complete', 'blocked');
CREATE TYPE requirement_doc_type AS ENUM ('product_overview', 'feature_requirement', 'technical_requirement');

-- Create feature_nodes table
CREATE TABLE IF NOT EXISTS feature_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES feature_nodes(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level feature_level NOT NULL,
  status feature_status NOT NULL DEFAULT 'not_started',
  position INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, parent_id, title),
  CONSTRAINT valid_level_progression CHECK (
    CASE
      WHEN level = 'epic' THEN parent_id IS NULL
      WHEN level = 'feature' THEN parent_id IS NOT NULL
      WHEN level = 'sub_feature' THEN parent_id IS NOT NULL
      WHEN level = 'task' THEN parent_id IS NOT NULL
      ELSE false
    END
  )
);

CREATE INDEX idx_feature_nodes_project_id ON feature_nodes(project_id);
CREATE INDEX idx_feature_nodes_parent_id ON feature_nodes(parent_id);
CREATE INDEX idx_feature_nodes_project_parent ON feature_nodes(project_id, parent_id);
CREATE INDEX idx_feature_nodes_status ON feature_nodes(status);
CREATE INDEX idx_feature_nodes_deleted_at ON feature_nodes(deleted_at);

-- Create requirements_documents table
CREATE TABLE IF NOT EXISTS requirements_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_node_id UUID REFERENCES feature_nodes(id) ON DELETE SET NULL,
  doc_type requirement_doc_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feature_node_id, doc_type),
  CONSTRAINT feature_link_validation CHECK (
    (feature_node_id IS NOT NULL AND doc_type = 'feature_requirement') OR
    (feature_node_id IS NULL AND doc_type IN ('product_overview', 'technical_requirement'))
  )
);

CREATE INDEX idx_requirements_documents_project_id ON requirements_documents(project_id);
CREATE INDEX idx_requirements_documents_feature_node_id ON requirements_documents(feature_node_id);
CREATE INDEX idx_requirements_documents_doc_type ON requirements_documents(doc_type);

-- Create requirement_versions table
CREATE TABLE IF NOT EXISTS requirement_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_doc_id UUID NOT NULL REFERENCES requirements_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_summary VARCHAR(500),
  UNIQUE(requirement_doc_id, version_number),
  CONSTRAINT valid_version_number CHECK (version_number > 0)
);

CREATE INDEX idx_requirement_versions_requirement_doc_id ON requirement_versions(requirement_doc_id);
CREATE INDEX idx_requirement_versions_created_at ON requirement_versions(created_at);

-- Enable RLS on all tables
ALTER TABLE feature_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_versions ENABLE ROW LEVEL SECURITY;
```

## File Structure
- Database migrations stored in: `/database/migrations/`
- Migration file: `20250220_pattern_shop_schema.sql`

## Acceptance Criteria
- [ ] All three tables created with correct column types and constraints
- [ ] Self-referential FK on feature_nodes works (parent_id references feature_nodes.id)
- [ ] Level progression constraint prevents invalid parent-child relationships
- [ ] RLS policies restrict access by project membership
- [ ] Indexes created on all FK and frequently-queried columns
- [ ] Soft deletes work (deleted_at timestamp set without removing rows)
- [ ] Version history table maintains immutable record of document changes
- [ ] UNIQUE constraints prevent duplicate FRDs per feature node

## Testing Instructions

1. **Test schema creation:**
   ```bash
   npm run db:migrate
   ```
   Verify no errors and all tables exist in Supabase dashboard.

2. **Test self-referential FK:**
   - Insert an epic (parent_id = NULL)
   - Insert a feature with parent_id = epic.id
   - Insert a sub-feature with parent_id = feature.id
   - Verify hierarchy is correct

3. **Test constraints:**
   - Attempt to create feature with parent_id = NULL (should fail)
   - Attempt to create epic with parent_id != NULL (should fail)
   - Attempt duplicate sibling titles (should fail)

4. **Test RLS:**
   - Sign in as user_a in project_x
   - Query feature_nodes—should see only project_x nodes
   - Sign in as user_b not in project_x
   - Query feature_nodes—should see no project_x nodes

5. **Test versioning:**
   - Create a requirements document
   - Create version_1 with content "A"
   - Create version_2 with content "B"
   - Verify both versions exist and are ordered by version_number

## Dependencies
- Phase 002: RLS foundations
- Phase 001: PostgreSQL and Supabase setup
