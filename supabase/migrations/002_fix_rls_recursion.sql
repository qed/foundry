-- Fix: RLS infinite recursion on org_members and project_members
-- The self-referencing policies cause PostgreSQL to loop infinitely.
-- Solution: Use SECURITY DEFINER helper functions that bypass RLS.

-- =============================================================================
-- STEP 1: Create helper functions (bypass RLS with SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION is_org_member(check_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = check_org_id AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_member(check_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = check_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================================================
-- STEP 2: Drop the broken policies
-- =============================================================================

DROP POLICY IF EXISTS "Users can read their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can read members of their organizations" ON org_members;
DROP POLICY IF EXISTS "Users can read projects in their organizations" ON projects;
DROP POLICY IF EXISTS "Users can read project members of their projects" ON project_members;

-- =============================================================================
-- STEP 3: Recreate policies using helper functions
-- =============================================================================

CREATE POLICY "Users can read their organizations"
  ON organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "Users can read members of their organizations"
  ON org_members FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "Users can read projects in their organizations"
  ON projects FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "Users can read project members of their projects"
  ON project_members FOR SELECT
  USING (is_project_member(project_id));
