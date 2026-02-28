# Phase 006 - Core UI Shell & Layout

## Objective
Build the main application shell with sidebar navigation, header bar with breadcrumbs, and overall layout structure. Create responsive design that collapses sidebar on mobile and maintains dark theme. Implement navigation between modules (Hall, Pattern Shop, Control Room, Assembly Floor, Insights Lab).

## Prerequisites
- Phase 001 - Next.js Project Setup
- Phase 005 - Multi-Tenancy Foundation
- Phase 007 - Global UI Components (should be completed in parallel)

## Context
The UI shell provides the consistent structure that all modules sit within. A well-designed shell ensures users can navigate intuitively and always understand their current location within the application. The sidebar houses the module navigation while the header provides breadcrumb context and user menu.

## Detailed Requirements

### 1. Sidebar Navigation Component

#### File: `components/layout/sidebar.tsx`
Main sidebar navigation component.

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
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
  { id: 'hall', name: 'Hall', icon: Lightbulb, description: 'Requirements' },
  {
    id: 'shop',
    name: 'Pattern Shop',
    icon: Shapes,
    description: 'Blueprints',
  },
  {
    id: 'room',
    name: 'Control Room',
    icon: Monitor,
    description: 'Dashboard',
  },
  {
    id: 'floor',
    name: 'Assembly Floor',
    icon: Hammer,
    description: 'Work Orders',
  },
  {
    id: 'lab',
    name: 'Insights Lab',
    icon: FlaskConical,
    description: 'Analytics',
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

  const baseUrl = `/org/${org.slug}/project/${project.id}`

  return (
    <aside
      className={`flex flex-col h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!isCollapsed && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              {org.name}
            </p>
            <p className="text-sm font-semibold text-slate-50 truncate">
              {project.name}
            </p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-slate-800 rounded"
          aria-label="Toggle sidebar"
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
          const isActive = pathname.includes(`/${module.id}`)

          return (
            <Link
              key={module.id}
              href={`${baseUrl}/${module.id}`}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
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

      {/* Footer (optional version info) */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500">v1.0.0</p>
        </div>
      )}
    </aside>
  )
}
```

**Key Features:**
- Shows org name and project name in header
- 5 module navigation items with icons
- Collapse/expand toggle
- Active module highlight
- Responsive icons and text
- Scrollable navigation area

### 2. Header with Breadcrumbs

#### File: `components/layout/header.tsx`
Top navigation bar with breadcrumbs and user menu.

```typescript
'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
import { useCurrentUser } from '@/lib/context/current-user-context'
import { useAuth } from '@/lib/auth/context'
import { ChevronRight, LogOut, Settings } from 'lucide-react'
import { useState } from 'react'

const MODULE_NAMES: Record<string, string> = {
  hall: 'Hall',
  shop: 'Pattern Shop',
  room: 'Control Room',
  floor: 'Assembly Floor',
  lab: 'Insights Lab',
}

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const params = useParams()
  const { org } = useOrg()
  const { project } = useProject()
  const { user } = useCurrentUser()
  const { signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // Extract module from pathname
  const module = Object.keys(MODULE_NAMES).find((m) =>
    pathname.includes(`/${m}`)
  )

  const breadcrumbs = [
    { label: org.name, href: `/org/${org.slug}` },
    { label: project.name, href: `/org/${org.slug}/project/${project.id}` },
  ]

  if (module) {
    breadcrumbs.push({
      label: MODULE_NAMES[module],
      href: `/org/${org.slug}/project/${project.id}/${module}`,
    })
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-slate-800 rounded mr-2"
          aria-label="Toggle sidebar"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <nav className="flex items-center gap-2 overflow-x-auto">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="w-4 h-4 text-slate-500" />}
              <Link
                href={crumb.href}
                className="text-sm text-slate-300 hover:text-slate-100 whitespace-nowrap transition-colors"
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </nav>
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
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded transition-colors"
              >
                <Settings className="w-4 h-4" />
                Profile Settings
              </Link>

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

**Key Features:**
- Breadcrumb navigation showing Org > Project > Module
- Mobile menu button
- User avatar with initials
- Dropdown menu with profile and logout
- Responsive design

### 3. Mobile Bottom Navigation

#### File: `components/layout/mobile-nav.tsx`
Bottom navigation for mobile devices.

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
import {
  Lightbulb,
  Shapes,
  Monitor,
  Hammer,
  FlaskConical,
} from 'lucide-react'

const MODULES = [
  { id: 'hall', name: 'Hall', icon: Lightbulb },
  { id: 'shop', name: 'Shop', icon: Shapes },
  { id: 'room', name: 'Room', icon: Monitor },
  { id: 'floor', name: 'Floor', icon: Hammer },
  { id: 'lab', name: 'Lab', icon: FlaskConical },
]

export function MobileNav() {
  const pathname = usePathname()
  const { org } = useOrg()
  const { project } = useProject()

  const baseUrl = `/org/${org.slug}/project/${project.id}`

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex items-center justify-around">
      {MODULES.map((module) => {
        const Icon = module.icon
        const isActive = pathname.includes(`/${module.id}`)

        return (
          <Link
            key={module.id}
            href={`${baseUrl}/${module.id}`}
            className={`flex flex-col items-center gap-1 px-3 py-3 text-xs transition-colors ${
              isActive
                ? 'text-blue-400 bg-blue-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="truncate">{module.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

### 4. Main Layout Wrapper

#### File: `components/layout/app-layout.tsx`
Main layout component combining sidebar, header, and content area.

```typescript
'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { MobileNav } from './mobile-nav'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <div
        className={`fixed md:static z-40 h-screen transition-transform duration-300 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Overlay for mobile */}
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

### 5. Update Project Layout to Use Shell

#### File: `app/org/[orgSlug]/project/[projectId]/layout.tsx` (updated)
Wrap project routes with AppLayout.

```typescript
import { redirect, notFound } from 'next/navigation'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ProjectProvider } from '@/lib/context/project-context'
import { CurrentUserProvider } from '@/lib/context/current-user-context'
import { OrgProvider } from '@/lib/context/org-context'
import { UnauthorizedError } from '@/lib/auth/errors'
import { AppLayout } from '@/components/layout/app-layout'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { orgSlug, projectId } = await params
  const { user, profile } = await requireAuthWithProfile()

  const supabase = await createServerSupabaseClient()

  // Get org
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', orgSlug)
    .single()

  if (orgError || !org) {
    notFound()
  }

  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // Verify user is member of org
  const { data: orgMember } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (!orgMember) {
    throw new UnauthorizedError('No access to this organization')
  }

  // Verify user is member of project
  const { data: projectMember, error: memberError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', project.id)
    .eq('user_id', user.id)
    .single()

  if (memberError || !projectMember) {
    throw new UnauthorizedError('No access to this project')
  }

  return (
    <OrgProvider org={org} userRole={orgMember.role as 'admin' | 'member'}>
      <ProjectProvider
        project={project}
        userRole={projectMember.role as 'leader' | 'developer'}
      >
        <CurrentUserProvider
          user={profile}
          isOrgAdmin={orgMember.role === 'admin'}
          isProjectLeader={projectMember.role === 'leader'}
        >
          <AppLayout>{children}</AppLayout>
        </CurrentUserProvider>
      </ProjectProvider>
    </OrgProvider>
  )
}
```

### 6. Module Page Templates

Create placeholder pages for each module to ensure proper routing.

#### File: `app/org/[orgSlug]/project/[projectId]/hall/page.tsx`
```typescript
'use client'

export default function HallPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Hall</h1>
      <p className="text-slate-400">
        Requirements management module coming soon...
      </p>
    </div>
  )
}
```

Similar pages for: shop/page.tsx, room/page.tsx, floor/page.tsx, lab/page.tsx

### 7. Styles for Dark Theme

Ensure `app/globals.css` includes:

```css
@layer base {
  /* Dark theme as default */
  html, body {
    background-color: rgb(15, 23, 42);
    color: rgb(241, 245, 249);
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background-color: rgb(30, 41, 59);
  }

  ::-webkit-scrollbar-thumb {
    background-color: rgb(71, 85, 105);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: rgb(100, 116, 139);
  }

  /* Focus styles */
  :focus-visible {
    outline: 2px solid rgb(59, 130, 246);
    outline-offset: 2px;
  }

  /* Link styles */
  a {
    color: rgb(147, 197, 253);
  }

  a:hover {
    color: rgb(191, 219, 254);
  }
}
```

## File Structure
Files created in this phase:
```
components/
├── layout/
│   ├── sidebar.tsx (NEW)
│   ├── header.tsx (NEW)
│   ├── mobile-nav.tsx (NEW)
│   └── app-layout.tsx (NEW)

app/
├── globals.css (UPDATED)
└── org/
    └── [orgSlug]/
        └── project/
            └── [projectId]/
                ├── layout.tsx (UPDATED)
                ├── page.tsx
                ├── hall/
                │   └── page.tsx (NEW)
                ├── shop/
                │   └── page.tsx (NEW)
                ├── room/
                │   └── page.tsx (NEW)
                ├── floor/
                │   └── page.tsx (NEW)
                └── lab/
                    └── page.tsx (NEW)
```

## Acceptance Criteria

1. **Sidebar Renders**: Sidebar displays with org name, project name, and 5 modules
2. **Sidebar Navigation**: Clicking module links navigates to respective pages
3. **Sidebar Collapse**: Collapse/expand toggle works, sidebar becomes narrow
4. **Header Renders**: Header shows breadcrumbs and user menu
5. **Breadcrumb Navigation**: Breadcrumbs are clickable links
6. **User Menu**: Clicking avatar shows dropdown with profile and logout
7. **Module Highlighting**: Active module is highlighted in sidebar
8. **Mobile Responsive**: On small screens, sidebar hides and bottom nav appears
9. **Mobile Sidebar Toggle**: Header menu button toggles sidebar on mobile
10. **Dark Theme**: All elements use dark color scheme (slate-950, slate-900, etc.)

## Testing Instructions

1. **Test Sidebar Display**:
   - Navigate to `/org/[slug]/project/[id]/hall`
   - Should see sidebar on left with org/project name
   - Should see 5 module items: Hall, Pattern Shop, Control Room, Assembly Floor, Insights Lab

2. **Test Module Navigation**:
   - Click each module in sidebar
   - Should navigate to respective module pages
   - Each page should load without errors

3. **Test Sidebar Collapse**:
   - Click collapse/expand button in sidebar
   - Sidebar should shrink to icon-only
   - Click again to expand

4. **Test Header Breadcrumbs**:
   - Navigate through different modules
   - Header should show: Org Name > Project Name > Module Name
   - Each breadcrumb should be clickable

5. **Test User Menu**:
   - Click user avatar in header
   - Dropdown should appear with profile and logout options
   - Click logout (use mock for now)

6. **Test Mobile Responsiveness** (resize window to 640px or less):
   - Sidebar should hide
   - Header should show menu button
   - Bottom navigation bar should appear
   - Click menu button to show/hide sidebar

7. **Test Mobile Navigation**:
   - On mobile, click module items in bottom nav
   - Should navigate to respective modules
   - Bottom nav should always be visible

8. **Test Active State**:
   - Navigate to `/org/[slug]/project/[id]/hall`
   - Hall module in sidebar should be highlighted (blue)
   - Navigate to shop
   - Shop should now be highlighted

9. **Test Dark Theme**:
   - Open DevTools
   - Inspect background colors
   - Should be dark: rgb(15, 23, 42) for body, rgb(30, 41, 59) for sidebar, etc.

10. **Test Overflow Handling**:
    - If breadcrumb is very long, should scroll horizontally, not break layout
    - If org/project name is very long, should truncate with ellipsis
