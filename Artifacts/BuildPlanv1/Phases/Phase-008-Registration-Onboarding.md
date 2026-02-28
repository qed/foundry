# Phase 008 - Registration & Onboarding

## Objective
Implement a complete onboarding flow for new users after email verification. Users either create a new organization or join an existing one with an invite code. After org selection, guide users through first project creation, then redirect to project dashboard.

## Prerequisites
- Phase 001 - Next.js Project Setup
- Phase 002 - Supabase Project & Database Schema
- Phase 003 - Supabase Auth Configuration
- Phase 004 - Auth Middleware & Sessions
- Phase 007 - Global UI Components

## Context
Proper onboarding is critical for user adoption. The flow should be frictionless: verify email → choose org path → create/join org → create first project → start using app. This phase ties together authentication and multi-tenancy into a cohesive user experience.

## Detailed Requirements

### 1. Onboarding Router

#### File: `app/onboarding/page.tsx`
Redirect to appropriate onboarding step.

```typescript
import { redirect } from 'next/navigation'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function OnboardingPage() {
  const { user } = await requireAuthWithProfile()
  const supabase = await createServerSupabaseClient()

  // Check if user has any organizations
  const { data: orgs } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)

  if (orgs && orgs.length > 0) {
    // User already has org, redirect to org selector
    redirect('/org')
  }

  // New user, start onboarding
  redirect('/onboarding/org-choice')
}
```

### 2. Organization Choice Page

#### File: `app/onboarding/org-choice/page.tsx`
Let user choose between creating or joining organization.

```typescript
'use client'

import Link from 'next/link'
import { Plus, UserPlus } from 'lucide-react'

export default function OrgChoicePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-50 mb-2">
            Welcome to Helix Foundry
          </h1>
          <p className="text-lg text-slate-400">
            Let's get you set up to build incredible projects
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Organization */}
          <Link
            href="/onboarding/create-org"
            className="group relative p-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 rounded-lg transition-all"
          >
            <div className="absolute top-4 right-4 p-3 bg-blue-600/20 group-hover:bg-blue-600/30 rounded-lg transition-colors">
              <Plus className="w-6 h-6 text-blue-400" />
            </div>

            <h2 className="text-2xl font-semibold text-slate-50 mb-2">
              Create Organization
            </h2>
            <p className="text-slate-400">
              Start fresh with your own workspace. You'll be able to invite team
              members later.
            </p>

            <div className="mt-4 text-sm text-blue-400 font-medium group-hover:text-blue-300">
              Create Now →
            </div>
          </Link>

          {/* Join Organization */}
          <Link
            href="/onboarding/join-org"
            className="group relative p-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-green-500 rounded-lg transition-all"
          >
            <div className="absolute top-4 right-4 p-3 bg-green-600/20 group-hover:bg-green-600/30 rounded-lg transition-colors">
              <UserPlus className="w-6 h-6 text-green-400" />
            </div>

            <h2 className="text-2xl font-semibold text-slate-50 mb-2">
              Join Organization
            </h2>
            <p className="text-slate-400">
              Already have an invite code? Join an existing workspace and start
              collaborating.
            </p>

            <div className="mt-4 text-sm text-green-400 font-medium group-hover:text-green-300">
              Join Now →
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          Need help?{' '}
          <a href="#" className="text-blue-400 hover:text-blue-300">
            Contact support
          </a>
        </div>
      </div>
    </main>
  )
}
```

### 3. Create Organization Page

#### File: `app/onboarding/create-org/page.tsx`
Form for creating new organization.

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/toast-container'

export default function CreateOrgPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Generate slug from org name
  const slug = orgName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!orgName.trim()) {
      setError('Organization name is required')
      setLoading(false)
      return
    }

    if (slug.length === 0) {
      setError('Organization name must contain valid characters')
      setLoading(false)
      return
    }

    try {
      // Call API to create organization
      const response = await fetch('/api/orgs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, slug }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization')
      }

      addToast('Organization created successfully!', 'success')
      // Redirect to create first project
      router.push(`/onboarding/create-project?orgId=${data.org.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-slate-50 mb-2">
            Create Organization
          </h1>
          <p className="text-slate-400 mb-6">
            Every project starts with an organization. You can invite team members
            later.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-900 text-red-100 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div>
              <Input
                label="Organization Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={loading}
                placeholder="Acme Corporation"
                autoFocus
              />
            </div>

            {slug && (
              <div className="p-3 bg-slate-800 rounded text-sm">
                <p className="text-slate-400">URL slug:</p>
                <p className="text-slate-50 font-mono">{slug}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !orgName.trim()}
              isLoading={loading}
              className="w-full"
            >
              Create Organization
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-sm text-slate-400 text-center">
              Or{' '}
              <Link href="/onboarding/org-choice" className="text-blue-400 hover:text-blue-300">
                go back
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
```

### 4. Join Organization Page

#### File: `app/onboarding/join-org/page.tsx`
Form for joining existing organization with invite code.

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast-container'

export default function JoinOrgPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleJoinOrg(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!inviteCode.trim()) {
      setError('Invite code is required')
      setLoading(false)
      return
    }

    try {
      // Call API to join organization
      const response = await fetch('/api/orgs/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join organization')
      }

      addToast('Successfully joined organization!', 'success')
      // Redirect to org
      router.push(`/org/${data.org.slug}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-slate-50 mb-2">
            Join Organization
          </h1>
          <p className="text-slate-400 mb-6">
            Enter the invite code provided by your organization admin.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-900 text-red-100 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleJoinOrg} className="space-y-4">
            <Input
              label="Invite Code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              disabled={loading}
              placeholder="ABC123XYZ789"
              autoFocus
            />

            <Button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              isLoading={loading}
              className="w-full"
            >
              Join Organization
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-sm text-slate-400 text-center">
              Don't have an invite?{' '}
              <Link href="/onboarding/org-choice" className="text-blue-400 hover:text-blue-300">
                Create one instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
```

### 5. Create First Project Page

#### File: `app/onboarding/create-project/page.tsx`
Wizard for creating first project.

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-container'

export default function CreateProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const orgId = searchParams.get('orgId')

  const [loading, setLoading] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!orgId) {
      setError('Organization ID missing')
      setLoading(false)
      return
    }

    if (!projectName.trim()) {
      setError('Project name is required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          name: projectName,
          description,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      addToast('Project created successfully!', 'success')
      // Redirect to project
      router.push(`/org/${data.org.slug}/project/${data.project.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!orgId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="bg-red-900 text-red-100 p-4 rounded">
          Invalid onboarding link. Please start over.
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-slate-50 mb-2">
            Create Your First Project
          </h1>
          <p className="text-slate-400 mb-6">
            Projects help you organize your work and collaborate with your team.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-900 text-red-100 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateProject} className="space-y-4">
            <Input
              label="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={loading}
              placeholder="My First Project"
              autoFocus
            />

            <Textarea
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder="What is this project about?"
              rows={3}
            />

            <Button
              type="submit"
              disabled={loading || !projectName.trim()}
              isLoading={loading}
              className="w-full"
            >
              Create Project
            </Button>
          </form>

          <p className="mt-4 text-xs text-slate-500 text-center">
            You can create more projects later
          </p>
        </div>
      </div>
    </main>
  )
}
```

### 6. Organization Creation API

#### File: `app/api/orgs/create/route.ts`
API endpoint for creating organization.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuthWithProfile()
    const { name, slug } = await request.json()

    // Validate inputs
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 409 }
      )
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name, slug })
      .select()
      .single()

    if (orgError || !org) {
      throw new Error('Failed to create organization')
    }

    // Add user as org admin
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'admin',
      })

    if (memberError) {
      throw new Error('Failed to add user to organization')
    }

    return NextResponse.json({ org })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### 7. Organization Join API

#### File: `app/api/orgs/join/route.ts`
API endpoint for joining organization with invite code.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * In a real application, you would have an invite_codes table that
 * tracks generated invite codes with expiration and usage limits.
 * For now, this is a simplified implementation.
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuthWithProfile()
    const { inviteCode } = await request.json()

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // In production, you would look up the invite code in invite_codes table
    // For now, we'll validate against a simple pattern or lookup table
    // This is a placeholder - implement proper invite validation

    // For MVP: decode invite code to get org slug
    // Invite code format: base64(orgId)
    let orgId: string
    try {
      orgId = Buffer.from(inviteCode, 'base64').toString('utf-8')
    } catch {
      return NextResponse.json(
        { error: 'Invalid invite code format' },
        { status: 400 }
      )
    }

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if user already is member
    const { data: existing } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', org.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 409 }
      )
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'member',
      })

    if (memberError) {
      throw new Error('Failed to join organization')
    }

    return NextResponse.json({ org })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### 8. Project Creation API

#### File: `app/api/projects/create/route.ts`
API endpoint for creating project.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { handleAuthError } from '@/lib/auth/errors'

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuthWithProfile()
    const { orgId, name, description } = await request.json()

    if (!orgId || !name) {
      return NextResponse.json(
        { error: 'Organization ID and project name are required' },
        { status: 400 }
      )
    }

    // Verify user has permission to create project in org
    const { org, isAdmin } = await getOrgAndValidateAccess(orgId)

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only org admins can create projects' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        org_id: org.id,
        name,
        description: description || null,
      })
      .select()
      .single()

    if (projectError || !project) {
      throw new Error('Failed to create project')
    }

    // Add user as project leader
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: 'leader',
      })

    if (memberError) {
      throw new Error('Failed to add user to project')
    }

    return NextResponse.json({ org, project })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

## File Structure
Files created in this phase:
```
app/
├── onboarding/
│   ├── page.tsx (NEW)
│   ├── org-choice/
│   │   └── page.tsx (NEW)
│   ├── create-org/
│   │   └── page.tsx (NEW)
│   ├── join-org/
│   │   └── page.tsx (NEW)
│   └── create-project/
│       └── page.tsx (NEW)
└── api/
    ├── orgs/
    │   ├── create/
    │   │   └── route.ts (NEW)
    │   └── join/
    │       └── route.ts (NEW)
    └── projects/
        └── create/
            └── route.ts (NEW)
```

## Acceptance Criteria

1. **Onboarding Router**: `/onboarding` redirects appropriately based on user state
2. **Org Choice Page**: Shows two options: create vs join
3. **Create Org Form**: Generates slug, creates org, adds user as admin
4. **Join Org Form**: Accepts invite code, adds user to org as member
5. **Create Project Form**: Creates project, adds user as leader
6. **Redirect Flow**: Each step redirects to next step correctly
7. **Validation**: Forms validate inputs and show errors
8. **Error Handling**: API returns appropriate error responses
9. **Toast Notifications**: Success/error messages shown to user
10. **Database State**: Org and project created in Supabase with correct roles

## Testing Instructions

1. **Test Onboarding Router**:
   - Create new user account
   - Verify email
   - Visit `/onboarding`
   - Should redirect to `/onboarding/org-choice`

2. **Test Org Choice Page**:
   - Navigate to `/onboarding/org-choice`
   - See two cards: Create Organization and Join Organization
   - Both cards should be clickable links

3. **Test Create Organization Flow**:
   - Click "Create Organization"
   - Enter org name (e.g., "Test Org")
   - Verify slug generates correctly
   - Submit form
   - Should redirect to create-project page
   - Check Supabase: organization should exist
   - Check Supabase: user should be org_members with role 'admin'

4. **Test Create Project**:
   - Complete org creation
   - Enter project name and description
   - Submit form
   - Should redirect to project dashboard
   - Check Supabase: project should exist with correct org_id
   - Check Supabase: user should be project_members with role 'leader'

5. **Test Join Organization Flow** (requires generating invite code):
   - Get an org ID from Supabase
   - Base64 encode it: `echo -n "org-uuid-here" | base64`
   - Navigate to `/onboarding/join-org`
   - Enter base64-encoded invite code
   - Submit form
   - Should show success and redirect to org
   - Check Supabase: user should be org_members with role 'member'

6. **Test Form Validation**:
   - Try submitting empty org name
   - Should show "Organization name is required" error
   - Try submitting invalid characters in org name
   - Should show slug error

7. **Test Duplicate Slug**:
   - Create org with name "Test Org"
   - Try creating another org with same name
   - Should show "Organization slug already exists" error

8. **Test Duplicate Membership**:
   - Join org with valid invite code
   - Try joining same org again
   - Should show "You are already a member" error

9. **Test Redirect on Existing Org**:
   - Create user with org membership
   - Visit `/onboarding`
   - Should redirect to `/org` (not onboarding)

10. **Test Complete Flow**:
    - Sign up new user
    - Verify email
    - Choose "Create Organization"
    - Create org "Acme Corp"
    - Create project "Product Team"
    - Should arrive at project dashboard
    - Sidebar should show org name, project name
    - Should be able to navigate to modules
