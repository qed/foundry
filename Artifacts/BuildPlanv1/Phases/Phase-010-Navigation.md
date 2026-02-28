# Phase 010 - Navigation & Module Switching

## Objective
Implement complete navigation system including sidebar highlighting, project switcher dropdown, user menu, breadcrumbs, and module navigation. Create keyboard shortcuts for power users and optimize mobile navigation. Ensure smooth transitions between modules and organizations.

## Prerequisites
- Phase 001 - Next.js Project Setup
- Phase 005 - Multi-Tenancy Foundation
- Phase 006 - Core UI Shell & Layout
- Phase 007 - Global UI Components
- Phase 009 - Roles & Permissions

## Context
Navigation is how users move through the application. A well-designed navigation system should be intuitive, accessible, and efficient. Power users benefit from keyboard shortcuts, while casual users benefit from clear visual hierarchy. This phase polishes the application's information architecture into a cohesive navigation experience.

## Detailed Requirements

### 1. Enhanced Sidebar with Active States

#### File: `components/layout/sidebar.tsx` (updated)
Improved sidebar with better active state handling.

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
import { usePermission } from '@/hooks/usePermission'
import { ProjectPermissions } from '@/lib/permissions/definitions'
import {
  Lightbulb,
  Shapes,
  Monitor,
  Hammer,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const MODULES = [
  {
    id: 'hall',
    name: 'Hall',
    icon: Lightbulb,
    description: 'Requirements',
    requiredPermission: ProjectPermissions.VIEW_REQUIREMENTS,
  },
  {
    id: 'shop',
    name: 'Pattern Shop',
    icon: Shapes,
    description: 'Blueprints',
    requiredPermission: ProjectPermissions.VIEW_BLUEPRINTS,
  },
  {
    id: 'room',
    name: 'Control Room',
    icon: Monitor,
    description: 'Dashboard',
    requiredPermission: ProjectPermissions.VIEW_DASHBOARD,
  },
  {
    id: 'floor',
    name: 'Assembly Floor',
    icon: Hammer,
    description: 'Work Orders',
    requiredPermission: ProjectPermissions.VIEW_WORK_ORDERS,
  },
  {
    id: 'lab',
    name: 'Insights Lab',
    icon: FlaskConical,
    description: 'Analytics',
    requiredPermission: ProjectPermissions.VIEW_INSIGHTS,
  },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { org } = useOrg()
  const { project } = useProject()
  const { canProject } = usePermission()

  const baseUrl = `/org/${org.slug}/project/${project.id}`

  // Determine active module
  const activeModule = MODULES.find((m) => pathname.includes(`/${m.id}`))

  return (
    <aside
      className={`flex flex-col h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide truncate">
              {org.name}
            </p>
            <p className="text-sm font-semibold text-slate-50 truncate">
              {project.name}
            </p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-slate-800 rounded transition-colors ml-2"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {MODULES.map((module) => {
          const Icon = module.icon
          const hasAccess = canProject(module.requiredPermission)
          const isActive = activeModule?.id === module.id

          if (!hasAccess) {
            return (
              <div
                key={module.id}
                className="flex items-center gap-3 px-3 py-2 rounded opacity-50 cursor-not-allowed text-slate-500 text-xs"
                title="You don't have permission to access this module"
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{module.name}</div>
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={module.id}
              href={`${baseUrl}/${module.id}`}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title={isCollapsed ? module.name : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {module.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {module.description}
                  </div>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-600 text-center">v1.0.0</p>
        </div>
      )}
    </aside>
  )
}
```

**Key Improvements:**
- Highlights active module with blue background
- Shows disabled state for modules user can't access
- Better tooltip support for collapsed state
- Improved accessibility with aria labels

### 2. Project Switcher Dropdown

#### File: `components/layout/project-switcher.tsx`
Dropdown menu for switching between projects.

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
import { ChevronDown, Plus } from 'lucide-react'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

export function ProjectSwitcher() {
  const { org } = useOrg()
  const { project: currentProject } = useProject()
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    async function loadProjects() {
      setLoading(true)
      try {
        const response = await fetch(`/api/orgs/${org.id}/projects`)
        const data = await response.json()
        setProjects(data.projects || [])
      } catch (error) {
        console.error('Failed to load projects:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [open, org.id])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded transition-colors w-full"
      >
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs text-slate-500 uppercase">Project</p>
          <p className="text-sm font-medium text-slate-50 truncate">
            {currentProject.name}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-3 text-sm text-slate-400 text-center">
              Loading projects...
            </div>
          )}

          {!loading && projects.length === 0 && (
            <div className="p-3 text-sm text-slate-400 text-center">
              No projects
            </div>
          )}

          {!loading &&
            projects.map((p) => (
              <Link
                key={p.id}
                href={`/org/${org.slug}/project/${p.id}`}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors ${
                  p.id === currentProject.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p.name}
              </Link>
            ))}

          <div className="border-t border-slate-700 p-2">
            <Link
              href={`/org/${org.slug}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors"
              onClick={() => setOpen(false)}
            >
              <Plus className="w-4 h-4" />
              Create Project
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 3. Enhanced Header with Breadcrumbs

#### File: `components/layout/breadcrumb.tsx`
Reusable breadcrumb component.

```typescript
'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

/**
 * Breadcrumb navigation component.
 *
 * @example
 * <Breadcrumb items={[
 *   { label: 'Home', href: '/' },
 *   { label: 'Projects' },
 *   { label: 'My Project' }
 * ]} />
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}

          <div className="flex items-center gap-1">
            {item.icon && <span className="text-slate-400">{item.icon}</span>}

            {item.href ? (
              <Link
                href={item.href}
                className="text-sm text-slate-300 hover:text-slate-100 whitespace-nowrap transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-sm text-slate-300 whitespace-nowrap">
                {item.label}
              </span>
            )}
          </div>
        </div>
      ))}
    </nav>
  )
}
```

#### File: `components/layout/header.tsx` (updated)
Use breadcrumb component.

```typescript
'use client'

import { usePathname } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
import { useCurrentUser } from '@/lib/context/current-user-context'
import { useAuth } from '@/lib/auth/context'
import { LogOut, Settings, Menu } from 'lucide-react'
import { useState } from 'react'
import { Breadcrumb, type BreadcrumbItem } from './breadcrumb'

const MODULE_INFO: Record<string, { name: string; icon: string }> = {
  hall: { name: 'Hall', icon: '💡' },
  shop: { name: 'Pattern Shop', icon: '🔧' },
  room: { name: 'Control Room', icon: '📊' },
  floor: { name: 'Assembly Floor', icon: '🔨' },
  lab: { name: 'Insights Lab', icon: '🧪' },
}

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const { org } = useOrg()
  const { project } = useProject()
  const { user } = useCurrentUser()
  const { signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // Extract module from pathname
  const module = Object.keys(MODULE_INFO).find((m) =>
    pathname.includes(`/${m}`)
  )

  const breadcrumbs: BreadcrumbItem[] = [
    { label: org.name, href: `/org/${org.slug}` },
    { label: project.name, href: `/org/${org.slug}/project/${project.id}` },
  ]

  if (module) {
    const moduleInfo = MODULE_INFO[module]
    breadcrumbs.push({
      icon: moduleInfo.icon,
      label: moduleInfo.name,
      href: `/org/${org.slug}/project/${project.id}/${module}`,
    })
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-slate-800 rounded transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Breadcrumb items={breadcrumbs} />
      </div>

      {/* User Menu */}
      <div className="relative ml-4">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded transition-colors"
        >
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm font-semibold">
            {user.display_name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase() || 'U'}
          </div>
          <span className="text-sm text-slate-300 hidden sm:inline">
            {user.display_name?.split(' ')[0] || 'User'}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg border border-slate-700 z-50">
            <div className="p-3 border-b border-slate-700">
              <p className="text-xs text-slate-500">Signed in as</p>
              <p className="text-sm font-medium text-slate-50 truncate">
                {user.display_name || 'User'}
              </p>
            </div>

            <div className="p-2 space-y-2">
              <a
                href="/profile"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </a>

              <button
                onClick={() => {
                  setMenuOpen(false)
                  signOut()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
```

### 4. Keyboard Shortcuts Handler

#### File: `hooks/useKeyboardShortcuts.ts`
Hook for implementing keyboard shortcuts.

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'

/**
 * Global keyboard shortcuts for navigation.
 *
 * Supported shortcuts:
 * - Cmd/Ctrl+K: Command palette (future)
 * - Cmd/Ctrl+1-5: Switch to module 1-5
 * - Cmd/Ctrl+?: Show help
 */
export function useKeyboardShortcuts() {
  const router = useRouter()
  const { org } = useOrg()
  const { project } = useProject()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      const modifierKey = isMac ? event.metaKey : event.ctrlKey

      // Cmd/Ctrl + 1-5: Jump to module
      if (modifierKey && !event.shiftKey && /^[1-5]$/.test(event.key)) {
        event.preventDefault()
        const moduleIndex = parseInt(event.key) - 1
        const modules = ['hall', 'shop', 'room', 'floor', 'lab']
        router.push(
          `/org/${org.slug}/project/${project.id}/${modules[moduleIndex]}`
        )
      }

      // Cmd/Ctrl+Shift+K: Command palette (not implemented yet)
      if (modifierKey && event.shiftKey && event.key === 'K') {
        event.preventDefault()
        // dispatch({ type: 'open-command-palette' })
      }

      // Cmd/Ctrl+?: Show help
      if (modifierKey && (event.key === '?' || event.shiftKey && event.key === '/')) {
        event.preventDefault()
        // dispatch({ type: 'open-help' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, org.slug, project.id])
}
```

#### File: `components/layout/keyboard-hint.tsx`
Display keyboard shortcut hints.

```typescript
'use client'

export function KeyboardHint() {
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  const modKey = isMac ? '⌘' : 'Ctrl'

  return (
    <div className="text-xs text-slate-500 space-y-1 mt-4 pt-4 border-t border-slate-700">
      <div className="flex justify-between">
        <span>Switch modules</span>
        <span>{modKey}+1-5</span>
      </div>
      <div className="flex justify-between">
        <span>Command palette</span>
        <span>{modKey}+⇧+K</span>
      </div>
    </div>
  )
}
```

### 5. Organization Switcher

#### File: `components/layout/org-switcher.tsx`
Dropdown to switch between organizations.

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { ChevronDown } from 'lucide-react'
import type { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']

interface OrgWithRole {
  org: Organization
  role: string
}

interface OrgSwitcherProps {
  currentOrgSlug: string
}

export function OrgSwitcher({ currentOrgSlug }: OrgSwitcherProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [orgs, setOrgs] = useState<OrgWithRole[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    async function loadOrgs() {
      setLoading(true)
      try {
        const response = await fetch('/api/orgs/list')
        const data = await response.json()
        setOrgs(data.orgs || [])
      } catch (error) {
        console.error('Failed to load organizations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOrgs()
  }, [open])

  const currentOrg = orgs.find((o) => o.org.slug === currentOrgSlug)

  return (
    <div className="relative px-4 py-3 border-b border-slate-700">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full hover:bg-slate-800 rounded px-2 py-1 transition-colors"
      >
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs text-slate-500 uppercase">Organization</p>
          <p className="text-sm font-medium text-slate-50 truncate">
            {currentOrg?.org.name || 'Loading...'}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-4 right-4 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {loading && (
            <div className="p-3 text-sm text-slate-400 text-center">
              Loading organizations...
            </div>
          )}

          {!loading && orgs.length === 0 && (
            <div className="p-3 text-sm text-slate-400 text-center">
              No organizations
            </div>
          )}

          {!loading &&
            orgs.map((org) => (
              <Link
                key={org.org.id}
                href={`/org/${org.org.slug}`}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors ${
                  org.org.slug === currentOrgSlug
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div>{org.org.name}</div>
                <div className="text-xs text-slate-500">{org.role}</div>
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}
```

### 6. Update App Layout with All Navigation

#### File: `components/layout/app-layout.tsx` (updated)
Include all navigation components.

```typescript
'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { MobileNav } from './mobile-nav'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

interface AppLayoutProps {
  children: React.ReactNode
  orgSlug: string
}

export function AppLayout({ children, orgSlug }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <div
        className={`fixed md:static z-40 h-screen transition-transform duration-300 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 flex flex-col`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        <MobileNav />
      </div>
    </div>
  )
}
```

### 7. API Endpoints for Navigation Data

#### File: `app/api/orgs/list/route.ts`
Get all organizations for current user.

```typescript
import { NextResponse } from 'next/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET() {
  try {
    const { user } = await requireAuthWithProfile()
    const supabase = await createServerSupabaseClient()

    const { data: orgs, error } = await supabase
      .from('org_members')
      .select(`
        role,
        organizations!inner(id, name, slug)
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      orgs: orgs?.map((item) => ({
        org: item.organizations,
        role: item.role,
      })) ?? [],
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

#### File: `app/api/orgs/[orgId]/projects/route.ts`
Get all projects in organization.

```typescript
import { NextResponse, NextRequest } from 'next/server'
import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

interface RouteParams {
  params: Promise<{ orgId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params

    await getOrgAndValidateAccess(orgId)

    const supabase = await createServerSupabaseClient()

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ projects: projects ?? [] })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

## File Structure
Files created/updated in this phase:
```
components/
├── layout/
│   ├── sidebar.tsx (UPDATED)
│   ├── header.tsx (UPDATED)
│   ├── app-layout.tsx (UPDATED)
│   ├── breadcrumb.tsx (NEW)
│   ├── project-switcher.tsx (NEW)
│   ├── org-switcher.tsx (NEW)
│   ├── keyboard-hint.tsx (NEW)
│   └── mobile-nav.tsx

hooks/
└── useKeyboardShortcuts.ts (NEW)

app/
└── api/
    ├── orgs/
    │   └── list/
    │       └── route.ts (NEW)
    └── (existing)
```

## Acceptance Criteria

1. **Breadcrumbs Work**: Shows Org > Project > Module hierarchy
2. **Sidebar Highlighting**: Active module highlighted in blue
3. **Permission Aware**: Restricted modules show disabled state
4. **Project Switcher**: Dropdown shows all projects in org
5. **Org Switcher**: Can switch between organizations
6. **User Menu**: Profile and logout options available
7. **Keyboard Shortcuts**: Cmd/Ctrl+1-5 switches modules
8. **Mobile Nav**: Bottom nav appears on mobile
9. **Responsive Design**: Works on all screen sizes
10. **Navigation Smooth**: All transitions are smooth (no page flicker)

## Testing Instructions

1. **Test Sidebar Highlighting**:
   - Navigate to `/org/[slug]/project/[id]/hall`
   - Hall should be highlighted blue
   - Navigate to shop
   - Shop should be highlighted, hall should not

2. **Test Breadcrumbs**:
   - View breadcrumbs in header
   - Should show: Org Name > Project Name > Module Name
   - Click each breadcrumb
   - Should navigate to respective page

3. **Test Project Switcher**:
   - Create multiple projects in org
   - Click project name in sidebar header
   - Dropdown should show all projects
   - Click different project
   - Should navigate to that project

4. **Test Org Switcher**:
   - Create user in multiple orgs
   - Click org name in sidebar header
   - Should show all orgs
   - Click different org
   - Should navigate to that org

5. **Test User Menu**:
   - Click user avatar in header
   - Menu should appear
   - Click Settings
   - Should navigate to profile page
   - Click Sign Out
   - Should sign out and redirect to login

6. **Test Permission Restricted Modules**:
   - Login as developer user
   - All modules should be accessible
   - Login as leader user
   - All modules should show "Restricted" badge

7. **Test Keyboard Shortcuts**:
   - Navigate to `/org/[slug]/project/[id]/hall`
   - Press Cmd/Ctrl+2
   - Should navigate to shop
   - Press Cmd/Ctrl+5
   - Should navigate to lab

8. **Test Mobile Navigation**:
   - Resize window to 640px or less
   - Sidebar should hide
   - Bottom nav bar should appear
   - Click module in bottom nav
   - Should navigate to module

9. **Test Mobile Sidebar Toggle**:
   - On mobile, sidebar should be hidden
   - Click menu icon in header
   - Sidebar should appear with overlay
   - Click overlay to close
   - Sidebar should hide

10. **Test Navigation Consistency**:
    - Navigate through multiple modules
    - Check breadcrumbs update correctly
    - Check sidebar highlighting updates
    - Check user menu works from any page
    - Check mobile nav appears on all pages
