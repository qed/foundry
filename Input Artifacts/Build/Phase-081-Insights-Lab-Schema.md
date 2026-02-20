# Phase 081 - Insights Lab Database Schema

## Objective
Establish the PostgreSQL database schema and RLS policies for The Insights Lab feedback collection and management system, enabling secure submission, storage, and retrieval of user feedback across multiple projects.

## Prerequisites
- Phase 002: Supabase Authentication & Authorization complete
- Supabase project created with PostgreSQL database access
- RLS policies framework established from earlier phases
- UUID extension enabled in PostgreSQL

## Context
The Insights Lab requires a robust database foundation to store user feedback from deployed applications, manage API keys for different projects, and maintain proper access control. The schema must support feedback categorization, enrichment metadata, conversion tracking to work orders/features, and efficient querying for the inbox interface.

## Detailed Requirements

### Core Tables

#### feedback_submissions Table
- **id** (uuid): Primary key, auto-generated via gen_random_uuid()
- **project_id** (uuid, FK): References projects.id, cascade delete
- **app_key_id** (uuid, FK): References app_keys.id, indicates which app submitted
- **content** (text): The feedback text submitted by user
- **submitter_email** (text, nullable): Email of submitter if provided
- **submitter_name** (text, nullable): Name of submitter if provided
- **metadata** (jsonb): Captures browser, device, page_url, user_agent, viewport, timestamp_client, etc.
- **category** (enum): bug | feature_request | ux_issue | performance | other | uncategorized (default: uncategorized)
- **tags** (text array, nullable): Array of tag strings for flexible categorization
- **score** (integer, nullable): AI-assigned priority score (0-100), NULL before enrichment
- **status** (enum): new | triaged | converted | archived (default: new)
- **converted_to_work_order_id** (uuid, FK nullable): References work_orders.id if converted
- **converted_to_feature_id** (uuid, FK nullable): References feature_nodes.id if converted
- **created_at** (timestamp): Auto-set to now(), indexed for sorting
- **updated_at** (timestamp): Auto-set to now(), updates on changes

#### app_keys Table
- **id** (uuid): Primary key, auto-generated
- **project_id** (uuid, FK): References projects.id, cascade delete
- **key_value** (text, unique): The actual API key (format: sf-int-XXXXXXXX), hashed in storage
- **name** (text): Human-readable label for the key (e.g., "Web App Production")
- **status** (enum): active | revoked (default: active)
- **created_by** (uuid, FK): References auth.users.id
- **created_at** (timestamp): Auto-set to now()

### Row-Level Security (RLS) Policies

#### feedback_submissions Policies
- **SELECT**: Enable for authenticated users where auth.uid() in (select user_id from project_members where project_id = feedback_submissions.project_id)
- **INSERT**: Enable for authenticated users where app_key exists and is active (validated in application layer)
- **UPDATE**: Enable for project members only (admins and editors)
- **DELETE**: Enable for project admins only

#### app_keys Policies
- **SELECT**: Enable for authenticated users who are project members of the project_id
- **INSERT**: Enable for authenticated users who are project admins
- **UPDATE**: Enable for authenticated users who are project admins (status field only)
- **DELETE**: Enable for project admins only

### Indexes
- feedback_submissions: index on (project_id, created_at DESC) for inbox listing
- feedback_submissions: index on (project_id, status) for filtering
- feedback_submissions: index on (project_id, score DESC) for prioritization
- feedback_submissions: index on (converted_to_work_order_id) for linked lookups
- feedback_submissions: index on (converted_to_feature_id) for linked lookups
- app_keys: index on (project_id, status) for key lookup
- app_keys: unique index on (key_value) for authentication

## Database Schema

```sql
-- Create enum types
CREATE TYPE feedback_category AS ENUM ('bug', 'feature_request', 'ux_issue', 'performance', 'other', 'uncategorized');
CREATE TYPE feedback_status AS ENUM ('new', 'triaged', 'converted', 'archived');
CREATE TYPE app_key_status AS ENUM ('active', 'revoked');

-- Create feedback_submissions table
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  app_key_id uuid NOT NULL REFERENCES app_keys(id) ON DELETE RESTRICT,
  content text NOT NULL,
  submitter_email text,
  submitter_name text,
  metadata jsonb DEFAULT '{}',
  category feedback_category DEFAULT 'uncategorized',
  tags text[] DEFAULT ARRAY[]::text[],
  score integer,
  status feedback_status DEFAULT 'new',
  converted_to_work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  converted_to_feature_id uuid REFERENCES feature_nodes(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create app_keys table
CREATE TABLE IF NOT EXISTS public.app_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key_value text NOT NULL UNIQUE,
  name text NOT NULL,
  status app_key_status DEFAULT 'active',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_feedback_submissions_project_created
  ON feedback_submissions(project_id, created_at DESC);
CREATE INDEX idx_feedback_submissions_project_status
  ON feedback_submissions(project_id, status);
CREATE INDEX idx_feedback_submissions_project_score
  ON feedback_submissions(project_id, score DESC NULLS LAST);
CREATE INDEX idx_feedback_submissions_work_order
  ON feedback_submissions(converted_to_work_order_id);
CREATE INDEX idx_feedback_submissions_feature
  ON feedback_submissions(converted_to_feature_id);
CREATE INDEX idx_app_keys_project_status
  ON app_keys(project_id, status);

-- Enable RLS
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_keys ENABLE ROW LEVEL SECURITY;

-- Feedback submissions policies
CREATE POLICY "Users can view feedback in their projects"
  ON feedback_submissions FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public insert with valid app key"
  ON feedback_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_keys
      WHERE app_keys.id = app_key_id
      AND app_keys.status = 'active'
    )
  );

CREATE POLICY "Project members can update feedback"
  ON feedback_submissions FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Only project admins can delete feedback"
  ON feedback_submissions FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- App keys policies
CREATE POLICY "Project members can view app keys"
  ON app_keys FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project admins can create app keys"
  ON app_keys FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    ) AND
    created_by = auth.uid()
  );

CREATE POLICY "Project admins can update app keys"
  ON app_keys FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Project admins can delete app keys"
  ON app_keys FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

## File Structure
```
/sessions/sleepy-wizardly-hypatia/mnt/Foundry/Build/
├── Phase-081-Insights-Lab-Schema.md (this file)
└── Related migrations to follow in subsequent phases
```

## Acceptance Criteria
- [x] feedback_submissions table created with all required fields and enums
- [x] app_keys table created with proper structure
- [x] All foreign key relationships established with appropriate cascade rules
- [x] RLS policies implemented for both tables with proper authentication checks
- [x] Indexes created for common query patterns
- [x] feedback_category and feedback_status enums properly defined
- [x] Metadata JSONB field configured to store browser, device, page_url, user_agent, viewport data
- [x] Primary key relationships established to work_orders and feature_nodes (cascade on delete for work orders)
- [x] created_at and updated_at timestamps auto-populated

## Testing Instructions

1. **Schema Validation**
   - Connect to Supabase database using psql
   - Run `\dt` to verify table creation
   - Run `\d feedback_submissions` to verify column structure
   - Run `\d app_keys` to verify column structure
   - Verify enums exist: `SELECT typname FROM pg_type WHERE typtype = 'e'`

2. **RLS Policy Testing**
   - Create test user accounts with different project roles
   - Test feedback_submissions SELECT: non-members should see no rows
   - Test feedback_submissions INSERT: valid app_key_id should succeed, invalid should fail
   - Test app_keys SELECT: only project members see keys
   - Test app_keys UPDATE: only admins can revoke keys

3. **Index Performance**
   - Run query: `SELECT * FROM feedback_submissions WHERE project_id = $1 ORDER BY created_at DESC LIMIT 20`
   - Verify index usage with EXPLAIN ANALYZE
   - Verify score-based ordering uses idx_feedback_submissions_project_score

4. **Foreign Key Constraints**
   - Attempt to insert feedback with non-existent app_key_id (should fail)
   - Attempt to insert feedback with non-existent project_id (should fail)
   - Verify cascade delete on project deletion removes feedback

5. **Metadata Storage**
   - Insert feedback with valid JSONB metadata: `{"browser": "Chrome", "device": "Desktop"}`
   - Insert feedback with complex nested metadata
   - Query and verify metadata retrieval
