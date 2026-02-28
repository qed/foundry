# Phase 009 - Roles & Permissions

## Objective
Implement role-based access control (RBAC) with three org-level roles (admin, member) and three project-level roles (leader, developer). Create permission checking utilities for both server-side API validation and client-side UI element visibility. Enforce permissions at database, API, and UI levels.

## Prerequisites
- Phase 001 - Next.js Project Setup
- Phase 002 - Supabase Project & Database Schema
- Phase 004 - Auth Middleware & Sessions
- Phase 005 - Multi-Tenancy Foundation

## Context
Permissions control what users can do in the application. A well-designed permission system ensures data security and prevents unauthorized actions. Three levels of enforcement (database RLS, API validation, UI visibility) provide defense in depth. This phase ties all prior phases together with access control logic.

## Detailed Requirements

### 1. Permission Model

#### Organizational Roles
- **Admin**: Full control over organization (create/delete projects, manage members, view all data)
- **Member**: Limited access (view projects, join projects if invited)

#### Project Roles
- **Leader**: Full project access (read-only dashboard, manage team, view all modules)
- **Developer**: Full project access (read and write to requirements, blueprints, work orders)

### 2. Permission Definitions

#### File: `lib/permissions/definitions.ts`
Define all permissions in the system.

```typescript
/**
 * Permission system for Helix Foundry.
 *
 * Permissions are organized by context (org or project) and action.
 */

export const OrgPermissions = {
  // Organization management
  MANAGE_ORG: 'manage_org',
  MANAGE_MEMBERS: 'manage_members',
  CREATE_PROJECT: 'create_project',
  DELETE_PROJECT: 'delete_project',
  MANAGE_INVITES: 'manage_invites',

  // Settings
  EDIT_ORG_SETTINGS: 'edit_org_settings',
  EDIT_BILLING: 'edit_billing',
} as const

export const ProjectPermissions = {
  // Project management
  MANAGE_PROJECT: 'manage_project',
  MANAGE_TEAM: 'manage_team',

  // Module: Hall (Requirements)
  CREATE_REQUIREMENT: 'create_requirement',
  EDIT_REQUIREMENT: 'edit_requirement',
  DELETE_REQUIREMENT: 'delete_requirement',
  VIEW_REQUIREMENTS: 'view_requirements',

  // Module: Pattern Shop (Blueprints)
  CREATE_BLUEPRINT: 'create_blueprint',
  EDIT_BLUEPRINT: 'edit_blueprint',
  DELETE_BLUEPRINT: 'delete_blueprint',
  VIEW_BLUEPRINTS: 'view_blueprints',

  // Module: Control Room (Dashboard)
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_ANALYTICS: 'view_analytics',

  // Module: Assembly Floor (Work Orders)
  CREATE_WORK_ORDER: 'create_work_order',
  EDIT_WORK_ORDER: 'edit_work_order',
  DELETE_WORK_ORDER: 'delete_work_order',
  VIEW_WORK_ORDERS: 'view_work_orders',

  // Module: Insights Lab (Analytics)
  VIEW_INSIGHTS: 'view_insights',
  EXPORT_DATA: 'export_data',
} as const

export type OrgPermission = (typeof OrgPermissions)[keyof typeof OrgPermissions]
export type ProjectPermission = (typeof ProjectPermissions)[keyof typeof ProjectPermissions]

/**
 * Define which permissions each role has
 */
export const OrgRolePermissions: Record<'admin' | 'member', OrgPermission[]> = {
  admin: [
    OrgPermissions.MANAGE_ORG,
    OrgPermissions.MANAGE_MEMBERS,
    OrgPermissions.CREATE_PROJECT,
    OrgPermissions.DELETE_PROJECT,
    OrgPermissions.MANAGE_INVITES,
    OrgPermissions.EDIT_ORG_SETTINGS,
    OrgPermissions.EDIT_BILLING,
  ],
  member: [
    // Members have basic access but limited permissions
  ],
}

export const ProjectRolePermissions: Record<
  'leader' | 'developer',
  ProjectPermission[]
> = {
  leader: [
    // Leaders can read everything, manage team
    ProjectPermissions.MANAGE_PROJECT,
    ProjectPermissions.MANAGE_TEAM,
    ProjectPermissions.VIEW_REQUIREMENTS,
    ProjectPermissions.VIEW_BLUEPRINTS,
    ProjectPermissions.VIEW_DASHBOARD,
    ProjectPermissions.VIEW_ANALYTICS,
    ProjectPermissions.VIEW_WORK_ORDERS,
    ProjectPermissions.VIEW_INSIGHTS,
  ],
  developer: [
    // Developers can read and write to project content
    ProjectPermissions.CREATE_REQUIREMENT,
    ProjectPermissions.EDIT_REQUIREMENT,
    ProjectPermissions.DELETE_REQUIREMENT,
    ProjectPermissions.VIEW_REQUIREMENTS,
    ProjectPermissions.CREATE_BLUEPRINT,
    ProjectPermissions.EDIT_BLUEPRINT,
    ProjectPermissions.DELETE_BLUEPRINT,
    ProjectPermissions.VIEW_BLUEPRINTS,
    ProjectPermissions.VIEW_DASHBOARD,
    ProjectPermissions.VIEW_ANALYTICS,
    ProjectPermissions.CREATE_WORK_ORDER,
    ProjectPermissions.EDIT_WORK_ORDER,
    ProjectPermissions.DELETE_WORK_ORDER,
    ProjectPermissions.VIEW_WORK_ORDERS,
    ProjectPermissions.VIEW_INSIGHTS,
  ],
}
```

### 3. Permission Checking Utility

#### File: `lib/permissions/checker.ts`
Core permission checking logic.

```typescript
import {
  OrgPermissions,
  ProjectPermissions,
  OrgRolePermissions,
  ProjectRolePermissions,
  type OrgPermission,
  type ProjectPermission,
} from './definitions'

/**
 * Check if user has org permission based on their role
 */
export function canOrgPermission(
  orgRole: 'admin' | 'member',
  permission: OrgPermission
): boolean {
  return OrgRolePermissions[orgRole].includes(permission)
}

/**
 * Check if user has project permission based on their role
 */
export function canProjectPermission(
  projectRole: 'leader' | 'developer',
  permission: ProjectPermission
): boolean {
  return ProjectRolePermissions[projectRole].includes(permission)
}

/**
 * Context for permission checking
 */
interface PermissionContext {
  orgRole: 'admin' | 'member'
  projectRole?: 'leader' | 'developer'
}

/**
 * Check multiple permissions with AND logic
 */
export function canAll(
  context: PermissionContext,
  permissions: (OrgPermission | ProjectPermission)[]
): boolean {
  return permissions.every((permission) => {
    // Check if it's an org permission
    if (Object.values(OrgPermissions).includes(permission as OrgPermission)) {
      return canOrgPermission(context.orgRole, permission as OrgPermission)
    }

    // Check if it's a project permission
    if (context.projectRole) {
      return canProjectPermission(
        context.projectRole,
        permission as ProjectPermission
      )
    }

    return false
  })
}

/**
 * Check multiple permissions with OR logic
 */
export function canAny(
  context: PermissionContext,
  permissions: (OrgPermission | ProjectPermission)[]
): boolean {
  return permissions.some((permission) => {
    // Check if it's an org permission
    if (Object.values(OrgPermissions).includes(permission as OrgPermission)) {
      return canOrgPermission(context.orgRole, permission as OrgPermission)
    }

    // Check if it's a project permission
    if (context.projectRole) {
      return canProjectPermission(
        context.projectRole,
        permission as ProjectPermission
      )
    }

    return false
  })
}
```

### 4. Server-Side Permission Guards

#### File: `lib/auth/permission-guards.ts`
Async permission checking for API routes and server components.

```typescript
import { UnauthorizedError, ForbiddenError } from './errors'
import {
  getProjectAndValidateAccess,
  getOrgAndValidateAccess,
} from './org-validation'
import {
  type OrgPermission,
  type ProjectPermission,
  OrgPermissions,
  ProjectPermissions,
} from '@/lib/permissions/definitions'
import { canOrgPermission, canProjectPermission } from '@/lib/permissions/checker'

/**
 * Require specific org permission or throw ForbiddenError
 */
export async function requireOrgPermission(
  orgId: string,
  permission: OrgPermission
) {
  const { role } = await getOrgAndValidateAccess(orgId)

  if (!canOrgPermission(role, permission)) {
    throw new ForbiddenError(`You do not have permission: ${permission}`)
  }

  return { orgId, role }
}

/**
 * Require specific project permission or throw ForbiddenError
 */
export async function requireProjectPermission(
  projectId: string,
  permission: ProjectPermission
) {
  const { projectRole, project } = await getProjectAndValidateAccess(projectId)

  if (!canProjectPermission(projectRole, permission)) {
    throw new ForbiddenError(`You do not have permission: ${permission}`)
  }

  return { projectId, project, projectRole }
}

/**
 * Require multiple permissions (AND logic)
 */
export async function requireAllOrgPermissions(
  orgId: string,
  permissions: OrgPermission[]
) {
  const { role } = await getOrgAndValidateAccess(orgId)

  const allPermitted = permissions.every((p) => canOrgPermission(role, p))

  if (!allPermitted) {
    throw new ForbiddenError('You do not have required permissions')
  }

  return { orgId, role }
}

/**
 * Require multiple permissions (AND logic) for project
 */
export async function requireAllProjectPermissions(
  projectId: string,
  permissions: ProjectPermission[]
) {
  const { projectRole, project } = await getProjectAndValidateAccess(projectId)

  const allPermitted = permissions.every((p) =>
    canProjectPermission(projectRole, p)
  )

  if (!allPermitted) {
    throw new ForbiddenError('You do not have required permissions')
  }

  return { projectId, project, projectRole }
}
```

### 5. Example API Route with Permission Check

#### File: `app/api/projects/[projectId]/settings/route.ts`
Example API route that requires permission.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import {
  requireProjectPermission,
  ProjectPermissions,
} from '@/lib/permissions/definitions'
import { handleAuthError } from '@/lib/auth/errors'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params
    const body = await request.json()

    // Require MANAGE_PROJECT permission
    const { project } = await requireProjectPermission(
      projectId,
      ProjectPermissions.MANAGE_PROJECT
    )

    // Update project settings
    // ... implementation

    return NextResponse.json({ success: true, project })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### 6. Client-Side Permission Hook

#### File: `hooks/usePermission.ts`
Hook for checking permissions in client components.

```typescript
'use client'

import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
import {
  canOrgPermission,
  canProjectPermission,
  canAll,
  canAny,
  type PermissionContext,
} from '@/lib/permissions/checker'
import {
  type OrgPermission,
  type ProjectPermission,
} from '@/lib/permissions/definitions'

export interface UsePermissionReturn {
  canOrg: (permission: OrgPermission) => boolean
  canProject: (permission: ProjectPermission) => boolean
  canAny: (permissions: (OrgPermission | ProjectPermission)[]) => boolean
  canAll: (permissions: (OrgPermission | ProjectPermission)[]) => boolean
}

/**
 * Hook for checking permissions in client components.
 *
 * @example
 * const { canProject } = usePermission()
 * if (canProject('create_requirement')) {
 *   // Show create button
 * }
 */
export function usePermission(): UsePermissionReturn {
  const { userRole: orgRole } = useOrg()
  const { userRole: projectRole } = useProject()

  const context: PermissionContext = {
    orgRole,
    projectRole,
  }

  return {
    canOrg: (permission) => canOrgPermission(orgRole, permission),
    canProject: (permission) => canProjectPermission(projectRole, permission),
    canAny: (permissions) => canAny(context, permissions),
    canAll: (permissions) => canAll(context, permissions),
  }
}
```

### 7. Permission-Aware UI Component Example

#### File: `components/project/create-requirement-button.tsx`
Example component that uses permission checking.

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/usePermission'
import { ProjectPermissions } from '@/lib/permissions/definitions'

interface CreateRequirementButtonProps {
  onCreateClick: () => void
}

/**
 * Button that only shows if user has permission to create requirements.
 */
export function CreateRequirementButton({
  onCreateClick,
}: CreateRequirementButtonProps) {
  const { canProject } = usePermission()

  // Don't render button if user doesn't have permission
  if (!canProject(ProjectPermissions.CREATE_REQUIREMENT)) {
    return null
  }

  return (
    <Button onClick={onCreateClick}>
      Create Requirement
    </Button>
  )
}
```

### 8. Permission-Aware List Component

#### File: `components/project/requirement-list-item.tsx`
Example list item with conditional edit/delete buttons.

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/usePermission'
import { ProjectPermissions } from '@/lib/permissions/definitions'
import { Edit, Trash2 } from 'lucide-react'

interface RequirementListItemProps {
  id: string
  title: string
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

/**
 * List item that shows edit/delete buttons only if user has permissions.
 */
export function RequirementListItem({
  id,
  title,
  onEdit,
  onDelete,
}: RequirementListItemProps) {
  const { canProject } = usePermission()

  const canEdit = canProject(ProjectPermissions.EDIT_REQUIREMENT)
  const canDelete = canProject(ProjectPermissions.DELETE_REQUIREMENT)

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800 rounded">
      <h4 className="font-medium">{title}</h4>

      <div className="flex gap-2">
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit?.(id)}
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}

        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete?.(id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
```

### 9. Module Access Control

#### File: `components/layout/module-nav-item.tsx`
Navigation item that respects module permissions.

```typescript
'use client'

import Link from 'next/link'
import { usePermission } from '@/hooks/usePermission'
import { ProjectPermissions } from '@/lib/permissions/definitions'
import { AlertCircle } from 'lucide-react'

interface ModuleNavItemProps {
  id: string
  name: string
  icon: React.ReactNode
  href: string
  requiredPermission: string
}

/**
 * Navigation item that shows disabled state if user lacks permission.
 */
export function ModuleNavItem({
  id,
  name,
  icon,
  href,
  requiredPermission,
}: ModuleNavItemProps) {
  const { canProject } = usePermission()

  const hasAccess = canProject(requiredPermission as any)

  if (!hasAccess) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded opacity-50 cursor-not-allowed"
        title="You don't have permission to access this module"
      >
        {icon}
        <div className="flex-1">
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Restricted
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-700 transition-colors"
    >
      {icon}
      <div className="flex-1">
        <div className="text-sm font-medium">{name}</div>
      </div>
    </Link>
  )
}
```

### 10. Permission Testing Utility

#### File: `lib/permissions/__tests__/checker.test.ts`
Unit tests for permission checking.

```typescript
import { describe, it, expect } from 'vitest'
import {
  canOrgPermission,
  canProjectPermission,
  canAll,
  canAny,
} from '../checker'
import { OrgPermissions, ProjectPermissions } from '../definitions'

describe('Permission Checker', () => {
  describe('canOrgPermission', () => {
    it('should allow admin all org permissions', () => {
      expect(canOrgPermission('admin', OrgPermissions.MANAGE_MEMBERS)).toBe(
        true
      )
      expect(canOrgPermission('admin', OrgPermissions.CREATE_PROJECT)).toBe(
        true
      )
    })

    it('should restrict members from admin permissions', () => {
      expect(canOrgPermission('member', OrgPermissions.MANAGE_MEMBERS)).toBe(
        false
      )
      expect(canOrgPermission('member', OrgPermissions.CREATE_PROJECT)).toBe(
        false
      )
    })
  })

  describe('canProjectPermission', () => {
    it('should allow leaders read permissions', () => {
      expect(
        canProjectPermission('leader', ProjectPermissions.VIEW_REQUIREMENTS)
      ).toBe(true)
    })

    it('should allow developers all project permissions', () => {
      expect(
        canProjectPermission('developer', ProjectPermissions.CREATE_REQUIREMENT)
      ).toBe(true)
      expect(
        canProjectPermission('developer', ProjectPermissions.EDIT_REQUIREMENT)
      ).toBe(true)
    })

    it('should restrict leaders from write permissions', () => {
      expect(
        canProjectPermission('leader', ProjectPermissions.CREATE_REQUIREMENT)
      ).toBe(false)
    })
  })

  describe('canAll', () => {
    it('should return true only if all permissions granted', () => {
      const context = { orgRole: 'admin' as const }

      expect(
        canAll(context, [
          OrgPermissions.MANAGE_MEMBERS,
          OrgPermissions.CREATE_PROJECT,
        ])
      ).toBe(true)

      expect(
        canAll(context, [
          OrgPermissions.MANAGE_MEMBERS,
          'unknown_permission' as any,
        ])
      ).toBe(false)
    })
  })

  describe('canAny', () => {
    it('should return true if any permission granted', () => {
      const context = { orgRole: 'member' as const }

      expect(
        canAny(context, [
          OrgPermissions.MANAGE_MEMBERS,
          OrgPermissions.CREATE_PROJECT,
        ])
      ).toBe(false)

      expect(canAny(context, [OrgPermissions.MANAGE_MEMBERS, 'any' as any])).toBe(
        false
      )
    })
  })
})
```

## File Structure
Files created in this phase:
```
lib/
├── permissions/
│   ├── definitions.ts (NEW)
│   ├── checker.ts (NEW)
│   └── __tests__/
│       └── checker.test.ts (NEW)
└── auth/
    └── permission-guards.ts (NEW)

hooks/
└── usePermission.ts (NEW)

components/
├── project/
│   ├── create-requirement-button.tsx (NEW - example)
│   ├── requirement-list-item.tsx (NEW - example)
│   └── module-nav-item.tsx (NEW - example)
└── (others)

app/
└── api/
    └── projects/
        └── [projectId]/
            └── settings/
                └── route.ts (NEW - example)
```

## Acceptance Criteria

1. **Permission Definitions**: All org and project permissions defined with clear names
2. **Permission Checker**: `canOrgPermission()` and `canProjectPermission()` work correctly
3. **Server Guards**: `requireOrgPermission()` throws ForbiddenError if permission denied
4. **Client Hook**: `usePermission()` returns correct permission state
5. **UI Elements**: Buttons/options hidden when user lacks permission
6. **API Protection**: API routes validate permissions and return 403 if denied
7. **Database RLS**: Row-level security provides additional protection
8. **Type Safety**: All permission strings are typed (no magic strings)
9. **Tests Pass**: Unit tests for permission checker pass
10. **Audit Trail**: Permission checks happen at database, API, and UI levels

## Testing Instructions

1. **Test Permission Definitions**:
   - Import OrgPermissions and ProjectPermissions
   - Verify all permissions defined
   - Check role permission mappings

2. **Test canOrgPermission**:
   - Call with admin role and MANAGE_MEMBERS
   - Should return true
   - Call with member role and MANAGE_MEMBERS
   - Should return false

3. **Test canProjectPermission**:
   - Call with leader role and CREATE_REQUIREMENT
   - Should return false
   - Call with developer role and CREATE_REQUIREMENT
   - Should return true

4. **Test Server Guard**:
   - Create API route with `requireProjectPermission()`
   - Call as user with permission
   - Should succeed
   - Call as user without permission
   - Should return 403

5. **Test usePermission Hook**:
   - Create test component in project context
   - Call `usePermission().canProject()`
   - Should reflect correct role permissions

6. **Test Permission-Aware Button**:
   - Create component using `CreateRequirementButton`
   - Render as developer
   - Button should appear
   - Render as leader
   - Button should not appear

7. **Test Module Access**:
   - Create list with restricted modules
   - Show as user with access
   - Module should be linked
   - Show as user without access
   - Module should show "Restricted" badge

8. **Test Permission Combinations**:
   - Use `canAll()` with multiple permissions
   - Should only return true if all granted
   - Use `canAny()` with multiple permissions
   - Should return true if any granted

9. **Test Audit Trail**:
   - Make restricted API call
   - Check server logs for permission check
   - Call forbidden action
   - Should log 403 error

10. **Test Role Transitions**:
    - Create user as project developer
    - Verify can create requirements
    - Change role to leader
    - Verify cannot create requirements
    - Change back to developer
    - Verify can create again
