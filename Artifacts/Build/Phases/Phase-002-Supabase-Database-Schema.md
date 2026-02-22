# Phase 002 - Supabase Project & Database Schema

## Objective
Set up a Supabase project and create the core database schema that supports multi-tenancy (organizations, projects, users, and role-based access). Implement Row Level Security (RLS) policies to ensure data isolation and security. Configure Supabase clients for both server-side and browser-side operations.

## Prerequisites
Phase 001 - Next.js Project Setup

## Context
Supabase provides authentication, PostgreSQL database, and real-time capabilities. This phase establishes the data model that all subsequent features depend on.

## Architectural Principle: RLS for Isolation, Application Code for Logic

**This convention must be followed throughout the entire Foundry codebase.**

Supabase Row Level Security (RLS) should be used **only for tenant isolation** — ensuring that every database query is scoped to the correct organization and project. RLS policies should be simple, consistent, and limited to answering one question: "Is this user a member of the org/project that owns this row?"

All other authorization and business logic — role-based permissions (admin vs. leader vs. developer), cross-module access patterns (Assembly Floor agent reading Pattern Shop features), workflow rules (who can promote an idea, who can approve a blueprint), and data validation — must live in **Next.js API routes and server actions**, not in SQL policies or database triggers.

**Why this matters:**
- Foundry has complex permission logic (org admins, project leaders with read-only dashboards, developers with module-specific access, AI agents needing cross-module reads). Encoding this in RLS creates nested SQL policies that are hard to test, hard to debug, and hard to change.
- When business logic lives in your TypeScript codebase, it's testable with standard unit tests, visible in code review, and modifiable without touching database migrations.
- AI agents need to query across modules (the Assembly Floor agent reads Pattern Shop features and Control Room blueprints). These cross-module reads should be handled by the service role key in server-side API routes, not by trying to make RLS policies understand agent contexts.
- If Foundry ever needs to migrate off Supabase, simple RLS policies (just project_id scoping) are trivial to replace with a WHERE clause in a data access layer. Complex RLS policies encoding business rules would require a full rewrite.

**In practice, this means:**
- Every module table gets one RLS pattern: `USING (EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = <table>.project_id AND project_members.user_id = auth.uid()))`
- INSERT/UPDATE/DELETE operations go through Next.js API routes that check roles in TypeScript before executing
- Agent operations use the `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) with project scoping enforced in the API route
- Never add database triggers for business logic — use server-side code instead

This convention applies to every subsequent phase that creates database tables or RLS policies.

## Detailed Requirements

### 1. Supabase Project Creation
- Create account at https://supabase.com
- Create new project with PostgreSQL database
- Region: Choose closest to primary user base
- Database password: Store securely in password manager
- Extract the following credentials for `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`: Project URL (format: `https://xxxxx.supabase.co`)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon key (safe for browser)
  - `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-only, never expose)

### 2. Core Tables Schema

#### Table: `profiles`
Extends Supabase auth.users with additional user information.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Service role can read all profiles
CREATE POLICY "Service role can read all profiles"
  ON profiles
  FOR SELECT
  USING (auth.role() = 'service_role');
```

#### Table: `organizations`
Represents a workspace or company in the system.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read orgs they are members of
CREATE POLICY "Users can read their organizations"
  ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = organizations.id
      AND org_members.user_id = auth.uid()
    )
  );

-- Service role can read all organizations
CREATE POLICY "Service role can read all organizations"
  ON organizations
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Create index on slug for faster lookups
CREATE INDEX idx_organizations_slug ON organizations(slug);
```

#### Table: `org_members`
Defines user membership and roles within organizations.

```sql
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, user_id)
);

-- Enable RLS
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read members of their organizations
CREATE POLICY "Users can read members of their organizations"
  ON org_members
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE handled by API routes using service role key
-- API routes check admin role in TypeScript before executing mutations
-- This keeps RLS simple and business logic testable

-- Service role can manage all org_members (used by API routes)
CREATE POLICY "Service role full access"
  ON org_members
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_org_members_role ON org_members(role);
```

#### Table: `projects`
Represents individual projects within organizations.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read projects in their organizations
CREATE POLICY "Users can read projects in their organizations"
  ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = projects.org_id
      AND org_members.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE handled by API routes using service role key
-- API routes check admin role in TypeScript before executing mutations

-- Service role can manage all projects (used by API routes)
CREATE POLICY "Service role full access"
  ON projects
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
```

#### Table: `project_members`
Defines user roles within specific projects.

```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'developer' CHECK (role IN ('leader', 'developer')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read project members if they are members of the project
CREATE POLICY "Users can read project members of their projects"
  ON project_members
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE handled by API routes using service role key
-- API routes check admin role in TypeScript before executing mutations

-- Service role can manage all project_members (used by API routes)
CREATE POLICY "Service role full access"
  ON project_members
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);
```

### 3. Supabase Client Configuration

#### File: `lib/supabase/client.ts`
Browser-side Supabase client for client components and the browser.

```typescript
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
```

- Uses `@supabase/ssr` for proper cookie handling in Next.js
- Exposes anon key (safe for browser use)
- Handles real-time subscriptions

#### File: `lib/supabase/server.ts`
Server-side Supabase client for API routes and server components.

```typescript
import { createServerClient, getCookies, setCookie } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseServiceRoleKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Handle cookie setting error
        }
      },
    },
  })
}

export async function getUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}
```

- Uses service role key for elevated permissions on server
- Handles cookie-based authentication for server components
- Provides helper functions for getting current user/session

### 4. Database Types Generation
Use Supabase CLI to generate TypeScript types from database schema:

```bash
npm install -D supabase
npx supabase login
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

The generated `types/database.ts` file will contain:
- Table interface definitions
- Type-safe query responses
- Database schema representation in TypeScript

#### File: `types/database.ts` (auto-generated, example structure)
```typescript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
      }
      // ... other tables follow same pattern
    }
  }
}
```

### 5. Database Functions (Helpers)
Create stored functions for common database operations:

#### Function: `get_user_organizations()`
Returns all organizations a user is a member of.

```sql
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
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
```

#### Function: `get_org_projects(org_id UUID)`
Returns all projects in an organization (user must be org member).

```sql
CREATE OR REPLACE FUNCTION get_org_projects(org_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
SELECT
  p.id,
  p.name,
  p.description,
  p.created_at,
  p.updated_at
FROM projects p
WHERE p.org_id = get_org_projects.org_id
AND EXISTS (
  SELECT 1 FROM org_members
  WHERE org_members.org_id = p.org_id
  AND org_members.user_id = auth.uid()
)
ORDER BY p.created_at DESC;
$$ LANGUAGE SQL SECURITY DEFINER;
```

## File Structure
Files created in this phase:
```
lib/
├── supabase/
│   ├── client.ts
│   └── server.ts
└── (other files)

types/
├── database.ts (auto-generated)
├── auth.ts (to be populated in Phase 003)
└── index.ts (to be updated)

.env.local
  (should contain NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
```

## Acceptance Criteria

1. **Supabase Project Created**: Project exists with PostgreSQL database, credentials stored in `.env.local`
2. **Tables Exist**: All five tables (profiles, organizations, org_members, projects, project_members) exist in Supabase
3. **RLS Enabled**: All tables have Row Level Security enabled
4. **RLS Policies Created**: All specified RLS policies exist and are enabled
5. **Indexes Created**: All specified indexes on foreign keys and slug exist
6. **Constraints Valid**: Unique constraints and check constraints work as expected
7. **Supabase Clients Work**: `lib/supabase/client.ts` and `lib/supabase/server.ts` export successfully
8. **Types Generated**: `types/database.ts` exists and contains all table definitions
9. **No Import Errors**: Importing from `lib/supabase/client` and `lib/supabase/server` in a test file produces no TypeScript errors
10. **Environment Variables**: App starts with `npm run dev` and connects to Supabase without errors

## Testing Instructions

1. **Verify Supabase Connection**:
   - Copy Supabase credentials to `.env.local`
   - Run `npm run dev`
   - App should start without "Missing Supabase environment variables" error

2. **Test Database Tables**:
   - In Supabase console, go to Table Editor
   - Verify tables exist: profiles, organizations, org_members, projects, project_members
   - Click into each table to confirm columns and data types

3. **Test RLS Policies**:
   - In Supabase console, go to Authentication > Policies
   - Verify all tables have policies listed
   - At least 3-4 policies per table should exist

4. **Test Indexes**:
   - In Supabase console, go to SQL Editor
   - Run query:
     ```sql
     SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public'
     AND tablename IN ('organizations', 'org_members', 'projects', 'project_members');
     ```
   - Should see indexes: `idx_organizations_slug`, `idx_org_members_org_id`, etc.

5. **Test Supabase Clients**:
   - Create a test API route `app/api/test-db/route.ts`:
     ```typescript
     import { getUser } from '@/lib/supabase/server'

     export async function GET() {
       const user = await getUser()
       return Response.json({ user })
     }
     ```
   - Visit http://localhost:3000/api/test-db
   - Should return JSON (user will be null if not authenticated)

6. **Verify Types**:
   - In any TypeScript file, import:
     ```typescript
     import type { Database } from '@/types/database'
     ```
   - TypeScript should recognize the import without errors
   - Should see IDE autocomplete for `Database['public']['Tables']`

7. **Test Database Functions**:
   - In Supabase SQL Editor, run:
     ```sql
     SELECT * FROM get_user_organizations();
     ```
   - Should return empty array or error (no authenticated user), but function exists

8. **Verify Row Level Security**:
   - Create test user account manually in Supabase Auth
   - Manually insert org_member record linking user to an organization
   - Query organizations table while authenticated as that user
   - Should only see organizations they're members of
   - Switch to different user context
   - Should not see first user's organizations
