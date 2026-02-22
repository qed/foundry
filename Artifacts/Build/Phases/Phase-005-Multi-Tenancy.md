# Phase 005 - Multi-Tenancy Foundation

## Objective
Implement URL-based multi-tenancy with organization and project routing. Create context providers for accessing current org/project, add hooks for retrieving org/project/user data, and ensure all database queries respect the org/project scope. Validate that users belong to the organization and project they're accessing.

## Prerequisites
- Phase 001 - Next.js Project Setup
- Phase 002 - Supabase Project & Database Schema
- Phase 003 - Supabase Auth Configuration
- Phase 004 - Auth Middleware & Sessions

## Context
Multi-tenancy allows the application to serve multiple organizations and projects from a single instance. URL-based scoping (e.g., `/org/acme/project/123/hall`) makes tenants explicit and enables users to work in multiple organizations easily. Context providers ensure org/project data is accessible throughout the component tree without prop drilling.

## Detailed Requirements

### 1. Dynamic Route Structure

#### URL Pattern
```
/org/[orgSlug]/project/[projectId]/[module]
  - /org/acme/project/abc123/hall
  - /org/acme/project/abc123/shop
  - /org/acme/project/abc123/room
  - /org/acme/project/abc123/floor
  - /org/acme/project/abc123/lab
```

#### Folder Structure
```
app/
├── org/
│   └── [orgSlug]/
│       ├── layout.tsx                  # Org layout, load org data
│       └── project/
│           └── [projectId]/
│               ├── layout.tsx          # Project layout, load project data
│               ├── page.tsx            # Project dashboard
│               ├── hall/
│               │   ├── layout.tsx
│               │   └── page.tsx
│               ├── shop/
│               │   ├── layout.tsx
│               │   └── page.tsx
│               ├── room/
│               │   ├── layout.tsx
│               │   └── page.tsx
│               ├── floor/
│               │   ├── layout.tsx
│               │   └── page.tsx
│               └── lab/
│                   ├── layout.tsx
│                   └── page.tsx
```

### 2. Org/Project Context Providers

#### File: `lib/context/org-context.tsx`
Context for current organization.

```typescript
'use client'

import React, { createContext, useContext } from 'react'
import type { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']

interface OrgContextType {
  org: Organization
  userRole: 'admin' | 'member'
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

interface OrgProviderProps {
  children: React.ReactNode
  org: Organization
  userRole: 'admin' | 'member'
}

export function OrgProvider({
  children,
  org,
  userRole,
}: OrgProviderProps) {
  return (
    <OrgContext.Provider value={{ org, userRole }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  const context = useContext(OrgContext)
  if (context === undefined) {
    throw new Error('useOrg must be used within OrgProvider')
  }
  return context
}
```

#### File: `lib/context/project-context.tsx`
Context for current project.

```typescript
'use client'

import React, { createContext, useContext } from 'react'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

interface ProjectContextType {
  project: Project
  userRole: 'leader' | 'developer'
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

interface ProjectProviderProps {
  children: React.ReactNode
  project: Project
  userRole: 'leader' | 'developer'
}

export function ProjectProvider({
  children,
  project,
  userRole,
}: ProjectProviderProps) {
  return (
    <ProjectContext.Provider value={{ project, userRole }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return context
}
```

#### File: `lib/context/current-user-context.tsx`
Context for current authenticated user.

```typescript
'use client'

import React, { createContext, useContext } from 'react'
import type { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['profiles']['Row']

interface CurrentUserContextType {
  user: UserProfile
  isOrgAdmin: boolean
  isProjectLeader: boolean
}

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(
  undefined
)

interface CurrentUserProviderProps {
  children: React.ReactNode
  user: UserProfile
  isOrgAdmin: boolean
  isProjectLeader: boolean
}

export function CurrentUserProvider({
  children,
  user,
  isOrgAdmin,
  isProjectLeader,
}: CurrentUserProviderProps) {
  return (
    <CurrentUserContext.Provider
      value={{ user, isOrgAdmin, isProjectLeader }}
    >
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext)
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider')
  }
  return context
}
```

### 3. Org Layout (Server Component)

#### File: `app/org/[orgSlug]/layout.tsx`
Load organization data and validate user membership.

```typescript
import { redirect, notFound } from 'next/navigation'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { OrgProvider } from '@/lib/context/org-context'
import { UnauthorizedError } from '@/lib/auth/errors'

interface OrgLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function OrgLayout({
  children,
  params,
}: OrgLayoutProps) {
  const { orgSlug } = await params
  const { user, profile } = await requireAuthWithProfile()

  const supabase = await createServerSupabaseClient()

  // Get organization by slug
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', orgSlug)
    .single()

  if (orgError || !org) {
    notFound()
  }

  // Verify user is member of organization
  const { data: membership, error: memberError } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    throw new UnauthorizedError(
      'You do not have access to this organization'
    )
  }

  return (
    <OrgProvider org={org} userRole={membership.role as 'admin' | 'member'}>
      {children}
    </OrgProvider>
  )
}
```

### 4. Project Layout (Server Component)

#### File: `app/org/[orgSlug]/project/[projectId]/layout.tsx`
Load project data and validate user membership.

```typescript
import { redirect, notFound } from 'next/navigation'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { useOrg } from '@/lib/context/org-context'
import { ProjectProvider } from '@/lib/context/project-context'
import { CurrentUserProvider } from '@/lib/context/current-user-context'
import { UnauthorizedError } from '@/lib/auth/errors'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { projectId } = await params
  const { user, profile } = await requireAuthWithProfile()

  const supabase = await createServerSupabaseClient()

  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // Verify user is member of project
  const { data: projectMember, error: memberError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', project.id)
    .eq('user_id', user.id)
    .single()

  if (memberError || !projectMember) {
    throw new UnauthorizedError(
      'You do not have access to this project'
    )
  }

  // Get org membership to determine if user is org admin
  const { data: orgMember } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', project.org_id)
    .eq('user_id', user.id)
    .single()

  return (
    <ProjectProvider
      project={project}
      userRole={projectMember.role as 'leader' | 'developer'}
    >
      <CurrentUserProvider
        user={profile}
        isOrgAdmin={orgMember?.role === 'admin' ?? false}
        isProjectLeader={projectMember.role === 'leader'}
      >
        {children}
      </CurrentUserProvider>
    </ProjectProvider>
  )
}
```

**Note:** This layout doesn't use the OrgProvider, but you can nest it if needed. For now, keeping it simple.

### 5. Utility Hooks for Data Fetching

#### File: `hooks/useOrgData.ts`
Hook to fetch organization-scoped data.

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useOrg } from '@/lib/context/org-context'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

interface UseOrgDataReturn {
  projects: Project[]
  loading: boolean
  error: Error | null
}

export function useOrgData(): UseOrgDataReturn {
  const { org } = useOrg()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('org_id', org.id)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        setProjects(data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [org.id])

  return { projects, loading, error }
}
```

#### File: `hooks/useProjectData.ts`
Hook to fetch project-scoped data (will be expanded in later phases).

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useProject } from '@/lib/context/project-context'

interface UseProjectDataReturn {
  loading: boolean
  error: Error | null
}

export function useProjectData(): UseProjectDataReturn {
  const { project } = useProject()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // This hook will be expanded in later phases
    // For now, it's a placeholder
  }, [project.id])

  return { loading, error }
}
```

### 6. API Route Protection with Org/Project Validation

#### File: `lib/auth/org-validation.ts`
Helper functions for validating org/project access in API routes.

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { UnauthorizedError, ForbiddenError, NotFoundError } from './errors'
import { getUser } from './server'

export async function getOrgAndValidateAccess(orgId: string) {
  const user = await getUser()
  if (!user) {
    throw new UnauthorizedError('Not authenticated')
  }

  const supabase = await createServerSupabaseClient()

  // Get org
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (orgError || !org) {
    throw new NotFoundError('Organization not found')
  }

  // Check membership
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    throw new ForbiddenError('No access to this organization')
  }

  return {
    org,
    user,
    role: membership.role as 'admin' | 'member',
    isAdmin: membership.role === 'admin',
  }
}

export async function getProjectAndValidateAccess(projectId: string) {
  const user = await getUser()
  if (!user) {
    throw new UnauthorizedError('Not authenticated')
  }

  const supabase = await createServerSupabaseClient()

  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    throw new NotFoundError('Project not found')
  }

  // Check project membership
  const { data: projectMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', project.id)
    .eq('user_id', user.id)
    .single()

  if (!projectMember) {
    throw new ForbiddenError('No access to this project')
  }

  // Check org membership
  const { data: orgMember } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', project.org_id)
    .eq('user_id', user.id)
    .single()

  return {
    project,
    user,
    projectRole: projectMember.role as 'leader' | 'developer',
    orgRole: orgMember?.role as 'admin' | 'member' | undefined,
    isProjectLeader: projectMember.role === 'leader',
    isOrgAdmin: orgMember?.role === 'admin' ?? false,
  }
}
```

### 7. Project Selection / Organization Switcher Page

#### File: `app/org/page.tsx`
Redirect users to their first organization or show org/project switcher.

```typescript
import { redirect } from 'next/navigation'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function OrgSelectorPage() {
  const { user } = await requireAuthWithProfile()
  const supabase = await createServerSupabaseClient()

  // Get user's organizations
  const { data: orgs, error } = await supabase
    .from('org_members')
    .select(`
      org_id,
      organizations!inner(id, name, slug)
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  if (error || !orgs || orgs.length === 0) {
    // No organizations, redirect to onboarding
    redirect('/onboarding/create-org')
  }

  // Redirect to first organization
  const firstOrg = orgs[0].organizations
  if (firstOrg) {
    const slug = 'slug' in firstOrg ? firstOrg.slug : (firstOrg as any).organizations?.slug
    redirect(`/org/${slug}`)
  }

  redirect('/onboarding/create-org')
}
```

### 8. Organization Home Page

#### File: `app/org/[orgSlug]/page.tsx`
Show list of projects in organization.

```typescript
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import Link from 'next/link'

interface OrgPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function OrgPage({ params }: OrgPageProps) {
  const { orgSlug } = await params
  const { user } = await requireAuthWithProfile()
  const supabase = await createServerSupabaseClient()

  // Get org
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    return <div>Organization not found</div>
  }

  // Get projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  if (!projects || projects.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">{org.name}</h1>
        <p className="text-slate-400 mb-6">No projects yet.</p>
        <Link
          href={`/org/${orgSlug}/create-project`}
          className="text-blue-400 hover:text-blue-300"
        >
          Create your first project
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">{org.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/org/${orgSlug}/project/${project.id}`}
            className="p-4 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
          >
            <h2 className="font-semibold text-slate-50">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-slate-400 mt-2">{project.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

### 9. Project Dashboard Page

#### File: `app/org/[orgSlug]/project/[projectId]/page.tsx`
Main project dashboard (landing page for project).

```typescript
import { useProject } from '@/lib/context/project-context'
import { useCurrentUser } from '@/lib/context/current-user-context'
import Link from 'next/link'

interface ProjectPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { orgSlug, projectId } = await params

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Project Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { name: 'Hall', slug: 'hall', icon: '💡' },
          { name: 'Pattern Shop', slug: 'shop', icon: '🔧' },
          { name: 'Control Room', slug: 'room', icon: '📊' },
          { name: 'Assembly Floor', slug: 'floor', icon: '🔨' },
          { name: 'Insights Lab', slug: 'lab', icon: '🧪' },
        ].map((module) => (
          <Link
            key={module.slug}
            href={`/org/${orgSlug}/project/${projectId}/${module.slug}`}
            className="p-6 bg-slate-800 rounded hover:bg-slate-700 transition-colors text-center"
          >
            <div className="text-3xl mb-2">{module.icon}</div>
            <h3 className="font-semibold text-slate-50">{module.name}</h3>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

## File Structure
Files created in this phase:
```
lib/
├── context/
│   ├── org-context.tsx (NEW)
│   ├── project-context.tsx (NEW)
│   └── current-user-context.tsx (NEW)
├── auth/
│   └── org-validation.ts (NEW)

hooks/
├── useOrgData.ts (NEW)
└── useProjectData.ts (NEW)

app/
├── org/
│   ├── page.tsx (NEW)
│   └── [orgSlug]/
│       ├── layout.tsx (NEW)
│       ├── page.tsx (NEW)
│       └── project/
│           └── [projectId]/
│               ├── layout.tsx (NEW)
│               ├── page.tsx (NEW)
│               ├── hall/
│               │   └── page.tsx (placeholder)
│               ├── shop/
│               │   └── page.tsx (placeholder)
│               ├── room/
│               │   └── page.tsx (placeholder)
│               ├── floor/
│               │   └── page.tsx (placeholder)
│               └── lab/
│                   └── page.tsx (placeholder)
```

## Acceptance Criteria

1. **URL Routing Works**: Routes at `/org/[slug]/project/[id]/[module]` load without errors
2. **Org Context Available**: `useOrg()` returns org data and user role in org-scoped pages
3. **Project Context Available**: `useProject()` returns project data and user role
4. **User Context Available**: `useCurrentUser()` returns profile and admin/leader flags
5. **Auth Validation**: Accessing org/project user is not member of throws error
6. **Redirect from /org**: `/org` redirects to first user organization
7. **Projects List**: `/org/[slug]` shows all projects in organization
8. **Project Dashboard**: `/org/[slug]/project/[id]` shows module links
9. **API Protection**: Organization/project API endpoints validate user access
10. **Data Scoping**: All queries only return org/project data user has access to

## Testing Instructions

1. **Test Org Context**:
   - Navigate to `/org/your-org-slug`
   - Create component that uses `useOrg()`
   - Should display org name and user role

2. **Test Project Context**:
   - Navigate to `/org/your-org-slug/project/your-project-id`
   - Create component that uses `useProject()`
   - Should display project name and user role

3. **Test Current User Context**:
   - In project page, create component with `useCurrentUser()`
   - Should display user profile and role flags

4. **Test Unauthorized Access**:
   - Get another user's org ID
   - Try accessing `/org/their-org-slug`
   - Should show error or redirect

5. **Test Org Switcher**:
   - Create multiple orgs with test user
   - Navigate to `/org`
   - Should redirect to first org
   - Manually navigate to second org
   - Should load without errors

6. **Test Project Listing**:
   - Navigate to `/org/your-org-slug`
   - Should see list of projects with links
   - Click project link
   - Should navigate to `/org/your-org-slug/project/[id]`

7. **Test Module Navigation**:
   - On project dashboard (`/org/your-org-slug/project/[id]`)
   - See 5 module cards (Hall, Shop, Room, Floor, Lab)
   - Click each module
   - Should navigate to respective module page

8. **Test API Org Validation**:
   - Create test API route using `getOrgAndValidateAccess()`
   - Call from org user
   - Should return org data
   - Call from non-member
   - Should return 403 error

9. **Test API Project Validation**:
   - Create test API route using `getProjectAndValidateAccess()`
   - Call from project member
   - Should return project data
   - Call from non-member
   - Should return 403 error

10. **Test useOrgData Hook**:
    - Create component that uses `useOrgData()`
    - Should load and display all projects in org
    - Verify only org projects shown (no other orgs' projects)
