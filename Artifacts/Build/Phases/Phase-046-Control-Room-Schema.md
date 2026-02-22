# Phase 046 - Control Room Database Schema

**Objective:** Design and implement the PostgreSQL database schema for the Control Room MVP, supporting blueprints, versions, and templates with proper relationships and access control.

**Prerequisites:**
- Supabase project initialized (Phase 002)
- RLS policies framework in place
- Basic project and organization structure established

**Context:**
The Control Room stores technical blueprints that describe feature implementation. Three blueprint types exist: Foundation (project-wide decisions), System Diagrams (architecture diagrams), and Feature Blueprints (1:1 with Pattern Shop features). The schema must support versioning, template management, and flexible content storage for rich text and Mermaid diagrams.

**Detailed Requirements:**

1. **blueprints Table**
   - Primary key: `id` (UUID, default: uuid_generate_v4())
   - Foreign keys:
     - `project_id` (UUID, NOT NULL) references projects(id) ON DELETE CASCADE
     - `feature_node_id` (UUID, nullable) references feature_nodes(id) ON DELETE CASCADE
     - `created_by` (UUID, NOT NULL) references auth.users(id)
   - Columns:
     - `blueprint_type` (enum: 'foundation', 'system_diagram', 'feature') NOT NULL
     - `title` (VARCHAR 255) NOT NULL
     - `content` (JSONB or TEXT) NOT NULL — stores rich text or Mermaid code
     - `status` (enum: 'draft', 'in_review', 'approved', 'implemented') DEFAULT 'draft'
     - `created_at` (TIMESTAMP) DEFAULT now()
     - `updated_at` (TIMESTAMP) DEFAULT now()
   - Constraints:
     - Unique constraint: (project_id, feature_node_id) where feature_node_id IS NOT NULL (only for feature blueprints)
     - Check: feature_node_id IS NOT NULL only if blueprint_type = 'feature'

2. **blueprint_versions Table**
   - Primary key: `id` (UUID)
   - Foreign keys:
     - `blueprint_id` (UUID, NOT NULL) references blueprints(id) ON DELETE CASCADE
     - `created_by` (UUID, NOT NULL) references auth.users(id)
   - Columns:
     - `version_number` (INTEGER) NOT NULL (auto-increment per blueprint)
     - `content` (JSONB or TEXT) NOT NULL — full snapshot of blueprint content at this version
     - `created_at` (TIMESTAMP) DEFAULT now()
   - Constraints:
     - Unique constraint: (blueprint_id, version_number)

3. **blueprint_templates Table**
   - Primary key: `id` (UUID)
   - Foreign keys:
     - `org_id` (UUID, nullable) references organizations(id) ON DELETE CASCADE — NULL for system templates
   - Columns:
     - `name` (VARCHAR 255) NOT NULL
     - `blueprint_type` (enum: 'foundation', 'system_diagram', 'feature') NOT NULL
     - `outline_content` (JSONB) NOT NULL — defines template structure and placeholder sections
     - `is_default` (BOOLEAN) DEFAULT false — system templates only
     - `created_at` (TIMESTAMP) DEFAULT now()
   - Constraints:
     - Unique constraint: (org_id, name) where org_id IS NOT NULL
     - Unique constraint on system templates: (is_default) where is_default = true AND org_id IS NULL per blueprint_type

4. **RLS Policies**
   - `blueprints`:
     - SELECT: user is project member
     - INSERT: user is project member
     - UPDATE: user is project member and either created the blueprint or is project admin
     - DELETE: user is project admin
   - `blueprint_versions`:
     - SELECT: user can access the parent blueprint
     - INSERT: (via trigger, not direct insert)
   - `blueprint_templates`:
     - SELECT: system templates visible to all; org templates visible to org members
     - INSERT: org admin only (org templates); system admin only (system templates)
     - UPDATE: creator or org/system admin
     - DELETE: org/system admin only

5. **Triggers**
   - `updated_at` trigger on blueprints table (auto-update timestamp on any change)
   - `auto_version_trigger` on blueprints: on UPDATE, insert row into blueprint_versions with incremented version_number (implementation detail for Phase 059)

**Database Schema**

```sql
-- Enum types
CREATE TYPE blueprint_type_enum AS ENUM ('foundation', 'system_diagram', 'feature');
CREATE TYPE blueprint_status_enum AS ENUM ('draft', 'in_review', 'approved', 'implemented');

-- blueprints table
CREATE TABLE blueprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_node_id UUID REFERENCES feature_nodes(id) ON DELETE CASCADE,
  blueprint_type blueprint_type_enum NOT NULL,
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  status blueprint_status_enum NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT feature_blueprint_requires_feature_node
    CHECK (
      (blueprint_type = 'feature' AND feature_node_id IS NOT NULL) OR
      (blueprint_type != 'feature' AND feature_node_id IS NULL)
    ),
  CONSTRAINT unique_feature_blueprint_per_node
    UNIQUE (project_id, feature_node_id)
    WHERE feature_node_id IS NOT NULL
);

CREATE INDEX idx_blueprints_project_id ON blueprints(project_id);
CREATE INDEX idx_blueprints_feature_node_id ON blueprints(feature_node_id);
CREATE INDEX idx_blueprints_status ON blueprints(status);
CREATE INDEX idx_blueprints_type ON blueprints(blueprint_type);

-- blueprint_versions table
CREATE TABLE blueprint_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (blueprint_id, version_number)
);

CREATE INDEX idx_blueprint_versions_blueprint_id ON blueprint_versions(blueprint_id);

-- blueprint_templates table
CREATE TABLE blueprint_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  blueprint_type blueprint_type_enum NOT NULL,
  outline_content JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT org_template_unique_name UNIQUE (org_id, name) WHERE org_id IS NOT NULL
);

CREATE INDEX idx_blueprint_templates_org_id ON blueprint_templates(org_id);
CREATE INDEX idx_blueprint_templates_type ON blueprint_templates(blueprint_type);

-- Trigger: update updated_at on blueprints
CREATE OR REPLACE FUNCTION update_blueprints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blueprints_updated_at_trigger
BEFORE UPDATE ON blueprints
FOR EACH ROW
EXECUTE FUNCTION update_blueprints_updated_at();

-- RLS Policies
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_templates ENABLE ROW LEVEL SECURITY;

-- blueprints RLS
CREATE POLICY blueprints_select_project_members ON blueprints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = blueprints.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY blueprints_insert_project_members ON blueprints
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = blueprints.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY blueprints_update_project_members ON blueprints
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = blueprints.project_id
      AND pm.user_id = auth.uid()
      AND (pm.role = 'admin' OR blueprints.created_by = auth.uid())
    )
  );

CREATE POLICY blueprints_delete_project_admin ON blueprints
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = blueprints.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- blueprint_versions RLS
CREATE POLICY blueprint_versions_select ON blueprint_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blueprints b
      INNER JOIN project_members pm ON b.project_id = pm.project_id
      WHERE b.id = blueprint_versions.blueprint_id
      AND pm.user_id = auth.uid()
    )
  );

-- blueprint_templates RLS
CREATE POLICY blueprint_templates_select_system ON blueprint_templates
  FOR SELECT
  USING (org_id IS NULL);

CREATE POLICY blueprint_templates_select_org ON blueprint_templates
  FOR SELECT
  USING (
    org_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = blueprint_templates.org_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY blueprint_templates_insert_org_admin ON blueprint_templates
  FOR INSERT
  WITH CHECK (
    org_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = blueprint_templates.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY blueprint_templates_update ON blueprint_templates
  FOR UPDATE
  USING (
    org_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = blueprint_templates.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY blueprint_templates_delete ON blueprint_templates
  FOR DELETE
  USING (
    org_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = blueprint_templates.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );
```

**File Structure**
```
app/
  lib/
    supabase/
      migrations/
        20260220_create_control_room_schema.sql
```

**Acceptance Criteria**
- [ ] All tables created with correct columns, types, and constraints
- [ ] Foreign key relationships properly established with CASCADE deletes
- [ ] Unique constraints prevent duplicate feature blueprints per node
- [ ] Indexes created for query performance (project_id, feature_node_id, status, type)
- [ ] RLS policies enforced: project members can view/edit, admins can delete
- [ ] Triggers auto-update timestamp and manage versioning
- [ ] Enum types created for blueprint_type and blueprint_status
- [ ] Schema tested with Supabase dashboard query editor

**Testing Instructions**
1. Execute migration in Supabase SQL Editor
2. Verify tables exist: `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
3. Test RLS by inserting test blueprints and verifying access rules
4. Verify unique constraint on feature blueprints: attempt to create two blueprints for same feature_node_id (should fail)
5. Test trigger: update a blueprint and verify updated_at timestamp changes
6. Verify indexes exist: `SELECT * FROM pg_indexes WHERE tablename IN ('blueprints', 'blueprint_versions', 'blueprint_templates')`
