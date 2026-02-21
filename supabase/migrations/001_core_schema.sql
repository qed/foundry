-- Phase 002: Core Database Schema
-- Tables: profiles, organizations, org_members, projects, project_members
-- With RLS policies, indexes, and helper functions
--
-- Structure: All tables first, then RLS, then indexes, then functions/triggers

-- =============================================================================
-- STEP 1: CREATE ALL TABLES
-- =============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'developer' CHECK (role IN ('leader', 'developer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- =============================================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: RLS POLICIES
-- =============================================================================

-- profiles
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can read all profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'service_role');

-- organizations
CREATE POLICY "Users can read their organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = organizations.id
      AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can read all organizations"
  ON organizations FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage organizations"
  ON organizations FOR ALL
  USING (auth.role() = 'service_role');

-- org_members
CREATE POLICY "Users can read members of their organizations"
  ON org_members FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on org_members"
  ON org_members FOR ALL
  USING (auth.role() = 'service_role');

-- projects
CREATE POLICY "Users can read projects in their organizations"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = projects.org_id
      AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on projects"
  ON projects FOR ALL
  USING (auth.role() = 'service_role');

-- project_members
CREATE POLICY "Users can read project members of their projects"
  ON project_members FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on project_members"
  ON project_members FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- STEP 4: INDEXES
-- =============================================================================

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_org_members_role ON org_members(role);
CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);

-- =============================================================================
-- STEP 5: HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  role VARCHAR
) AS $$
SELECT
  o.id,
  o.name,
  o.slug,
  o.created_at,
  o.updated_at,
  om.role
FROM organizations o
INNER JOIN org_members om ON o.id = om.org_id
WHERE om.user_id = auth.uid()
ORDER BY o.created_at DESC;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_org_projects(target_org_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
SELECT
  p.id,
  p.name,
  p.description,
  p.created_at,
  p.updated_at
FROM projects p
WHERE p.org_id = target_org_id
AND EXISTS (
  SELECT 1 FROM org_members
  WHERE org_members.org_id = p.org_id
  AND org_members.user_id = auth.uid()
)
ORDER BY p.created_at DESC;
$$ LANGUAGE SQL SECURITY DEFINER;

-- =============================================================================
-- STEP 6: TRIGGERS
-- =============================================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER org_members_updated_at
  BEFORE UPDATE ON org_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER project_members_updated_at
  BEFORE UPDATE ON project_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
