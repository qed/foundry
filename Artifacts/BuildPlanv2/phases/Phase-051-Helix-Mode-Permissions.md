# PHASE 051 — Helix Mode Permissions

## Objective
Extend v1 ProjectPermissions system with Helix-specific permissions. Implement permission checks in Helix UI components (for show/hide) and API routes (for authorization).

## Prerequisites
- Phase 001-050 completed (all Helix MVP + polish + mobile)
- v1 ProjectPermissions system available
- Role mapping infrastructure in place (Leader, Developer, Viewer, etc.)
- API routes for Helix operations

## Epic Context
**Epic 6 — MVP Polish & Cross-Cutting**
Phase 051 secures Helix Mode with fine-grained permissions. This cross-cutting concern ensures proper access control and data protection across all Helix operations.

## Context
The Helix MVP lacks permission boundaries. All users can access all features. This creates security and organizational issues:
- Viewers can complete steps and gates (unauthorized)
- Developers can override gate checks (should be leader-only)
- Anyone can export sensitive project data
- No audit trail of who performed actions

This phase implements:
- 5 new Helix-specific permissions
- Role-based permission mapping (Leader, Developer, Viewer)
- UI-level permission checks (show/hide buttons)
- API-level permission validation (reject unauthorized requests)

## Detailed Requirements

### 1. Permission Definitions
```typescript
// lib/permissions/definitions.ts (UPDATED)

import { Permission, Role, PermissionCheckResult } from '@/types/permissions';

/**
 * Helix-specific permissions
 */
export const HELIX_PERMISSIONS = {
  TOGGLE_HELIX_MODE: {
    name: 'TOGGLE_HELIX_MODE',
    description: 'Enable or disable Helix Mode for a project',
    category: 'helix',
    requiresRole: 'LEADER',
  },
  COMPLETE_HELIX_STEP: {
    name: 'COMPLETE_HELIX_STEP',
    description: 'Mark Helix process steps as complete',
    category: 'helix',
    requiresRole: 'LEADER_DEVELOPER',
  },
  OVERRIDE_GATE_CHECK: {
    name: 'OVERRIDE_GATE_CHECK',
    description: 'Skip or override Helix gate checks',
    category: 'helix',
    requiresRole: 'LEADER',
  },
  VIEW_HELIX_PROCESS: {
    name: 'VIEW_HELIX_PROCESS',
    description: 'View Helix process, stages, steps, and evidence',
    category: 'helix',
    requiresRole: 'LEADER_DEVELOPER_VIEWER',
  },
  EXPORT_HELIX_DATA: {
    name: 'EXPORT_HELIX_DATA',
    description: 'Export Helix evidence and process summaries',
    category: 'helix',
    requiresRole: 'LEADER_DEVELOPER',
  },
} as const;

/**
 * All permissions including existing v1 permissions
 */
export const ALL_PERMISSIONS = {
  // ... existing v1 permissions ...
  ...HELIX_PERMISSIONS,
} as const;

/**
 * Role-based permission mapping
 */
export const ROLE_PERMISSION_MAP: Record<Role, Permission[]> = {
  LEADER: [
    // ... existing v1 permissions ...
    'TOGGLE_HELIX_MODE',
    'COMPLETE_HELIX_STEP',
    'OVERRIDE_GATE_CHECK',
    'VIEW_HELIX_PROCESS',
    'EXPORT_HELIX_DATA',
  ],
  DEVELOPER: [
    // ... existing v1 permissions ...
    'COMPLETE_HELIX_STEP',
    'VIEW_HELIX_PROCESS',
    'EXPORT_HELIX_DATA',
  ],
  VIEWER: [
    // ... existing v1 permissions ...
    'VIEW_HELIX_PROCESS',
  ],
  GUEST: [
    // Guests have no Helix permissions
  ],
} as const;

/**
 * Check if user has permission
 */
export function hasPermission(
  userRole: Role,
  permission: string
): PermissionCheckResult {
  const rolePermissions = ROLE_PERMISSION_MAP[userRole] || [];
  const hasPermission = rolePermissions.includes(permission as any);

  return {
    allowed: hasPermission,
    role: userRole,
    permission,
    reason: hasPermission
      ? 'User has required role'
      : `Permission "${permission}" not available for role "${userRole}"`,
  };
}

/**
 * Check multiple permissions (AND logic)
 */
export function hasAllPermissions(
  userRole: Role,
  permissions: string[]
): PermissionCheckResult {
  const results = permissions.map(p => hasPermission(userRole, p));
  const allowed = results.every(r => r.allowed);

  return {
    allowed,
    role: userRole,
    permission: permissions.join(' + '),
    reason: allowed
      ? 'User has all required permissions'
      : `Missing: ${results.filter(r => !r.allowed).map(r => r.permission).join(', ')}`,
  };
}

/**
 * Check multiple permissions (OR logic)
 */
export function hasAnyPermission(
  userRole: Role,
  permissions: string[]
): PermissionCheckResult {
  const results = permissions.map(p => hasPermission(userRole, p));
  const allowed = results.some(r => r.allowed);

  return {
    allowed,
    role: userRole,
    permission: permissions.join(' | '),
    reason: allowed
      ? 'User has at least one required permission'
      : `Missing all of: ${permissions.join(', ')}`,
  };
}

/**
 * Get all permissions available to a role
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSION_MAP[role] || [];
}

/**
 * Get roles that have a specific permission
 */
export function getRolesWithPermission(permission: string): Role[] {
  return Object.entries(ROLE_PERMISSION_MAP)
    .filter(([_, permissions]) => permissions.includes(permission as any))
    .map(([role]) => role as Role);
}
```

### 2. Helix Permission Hook
```typescript
// lib/helix/permissions.ts
import { useAuth } from '@/hooks/auth/useAuth';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  HELIX_PERMISSIONS,
} from '@/lib/permissions/definitions';

/**
 * Hook for permission checks in components
 */
export function useHelixPermissions() {
  const { user } = useAuth();

  const userRole = user?.role || 'GUEST';

  return {
    // Individual permission checks
    canToggleHelixMode: () =>
      hasPermission(userRole, HELIX_PERMISSIONS.TOGGLE_HELIX_MODE.name).allowed,

    canCompleteStep: () =>
      hasPermission(userRole, HELIX_PERMISSIONS.COMPLETE_HELIX_STEP.name).allowed,

    canOverrideGateCheck: () =>
      hasPermission(userRole, HELIX_PERMISSIONS.OVERRIDE_GATE_CHECK.name).allowed,

    canViewHelixProcess: () =>
      hasPermission(userRole, HELIX_PERMISSIONS.VIEW_HELIX_PROCESS.name).allowed,

    canExportHelixData: () =>
      hasPermission(userRole, HELIX_PERMISSIONS.EXPORT_HELIX_DATA.name).allowed,

    // Combined checks
    canEditHelix: () =>
      hasPermission(userRole, HELIX_PERMISSIONS.COMPLETE_HELIX_STEP.name).allowed,

    canAdministerHelix: () =>
      hasPermission(userRole, HELIX_PERMISSIONS.TOGGLE_HELIX_MODE.name).allowed,

    // Get detailed result
    checkPermission: (permission: string) =>
      hasPermission(userRole, permission),

    checkAllPermissions: (permissions: string[]) =>
      hasAllPermissions(userRole, permissions),

    checkAnyPermission: (permissions: string[]) =>
      hasAnyPermission(userRole, permissions),
  };
}

/**
 * Higher-order component for permission-protected routes
 */
import React from 'react';

interface PermissionGateProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  fallback,
  children,
}) => {
  const { checkPermission } = useHelixPermissions();
  const result = checkPermission(permission);

  if (!result.allowed) {
    return (
      fallback || (
        <div className="p-6 bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded">
          <p className="text-yellow-300 font-semibold">Access Denied</p>
          <p className="text-yellow-400 text-sm mt-1">{result.reason}</p>
        </div>
      )
    );
  }

  return <>{children}</>;
};

export default PermissionGate;
```

### 3. UI-Level Permission Checks in Components
```typescript
// components/helix/StepDetailView.tsx (UPDATED with permissions)
'use client';

import React from 'react';
import { useHelixPermissions } from '@/lib/helix/permissions';

export const StepDetailView: React.FC = () => {
  const { canCompleteStep, canExportHelixData } = useHelixPermissions();

  return (
    <div>
      {/* Step content */}

      {/* Action buttons - conditional based on permissions */}
      <div className="flex gap-4">
        {/* Complete step button - only shown to users with permission */}
        {canCompleteStep() && (
          <button
            onClick={() => completeStep()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
          >
            Complete Step
          </button>
        )}

        {/* Export button - only shown to users with permission */}
        {canExportHelixData() && (
          <ExportButton
            type="step"
            step={step}
            stage={stage}
            evidence={evidence}
            completedBy={currentUser.name}
          />
        )}
      </div>
    </div>
  );
};

export default StepDetailView;
```

```typescript
// components/helix/StageGateCheck.tsx (UPDATED with permissions)
'use client';

import React from 'react';
import { useHelixPermissions } from '@/lib/helix/permissions';

export const StageGateCheck: React.FC = () => {
  const { canOverrideGateCheck, canCompleteStep } = useHelixPermissions();

  return (
    <div className="bg-[#1a1d27] border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">Gate Check: {stage.name}</h2>

      {/* Gate check items */}
      <div className="space-y-4 mb-6">
        {gateCheckItems.map((item) => (
          <div key={item.key} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={item.completed}
              disabled={!canCompleteStep()} // Disabled if no permission
              onChange={() => toggleItem(item.key)}
              className="mt-1"
            />
            <label className="text-gray-300">{item.label}</label>
          </div>
        ))}
      </div>

      {/* Action buttons with permission checks */}
      <div className="flex gap-4">
        <button
          onClick={() => completeGate()}
          disabled={!canCompleteStep()}
          className={`px-4 py-2 rounded font-semibold ${
            canCompleteStep()
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Complete Gate
        </button>

        {/* Override button - leader only */}
        {canOverrideGateCheck() && (
          <button
            onClick={() => overrideGate()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold"
          >
            Override Gate
          </button>
        )}
      </div>
    </div>
  );
};

export default StageGateCheck;
```

### 4. API-Level Permission Checks
```typescript
// app/api/helix/step/[stepKey]/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hasPermission } from '@/lib/permissions/definitions';

export async function POST(
  request: NextRequest,
  { params }: { params: { stepKey: string } }
) {
  try {
    // Get session
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const userRole = session.user.role || 'GUEST';

    // Check permission
    const permission = hasPermission(userRole, 'COMPLETE_HELIX_STEP');
    if (!permission.allowed) {
      return NextResponse.json(
        { error: 'Forbidden', reason: permission.reason },
        { status: 403 }
      );
    }

    // Process step completion
    const body = await request.json();
    const result = await completeHelixStep(params.stepKey, body, session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error completing step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/helix/gate-check/[gateKey]/override/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hasPermission } from '@/lib/permissions/definitions';

export async function POST(
  request: NextRequest,
  { params }: { params: { gateKey: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check OVERRIDE_GATE_CHECK permission (leader only)
    const permission = hasPermission(session.user.role || 'GUEST', 'OVERRIDE_GATE_CHECK');
    if (!permission.allowed) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          reason: 'Only project leaders can override gate checks',
        },
        { status: 403 }
      );
    }

    // Log override action for audit trail
    const body = await request.json();
    await logHelixAction('GATE_OVERRIDE', params.gateKey, session.user.id, body.reason);

    const result = await overrideGateCheck(params.gateKey, body, session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error overriding gate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

```typescript
// app/api/helix/artifacts/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hasPermission } from '@/lib/permissions/definitions';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check EXPORT_HELIX_DATA permission
    const permission = hasPermission(session.user.role || 'GUEST', 'EXPORT_HELIX_DATA');
    if (!permission.allowed) {
      return NextResponse.json(
        { error: 'Forbidden', reason: 'You do not have permission to export Helix data' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const exportData = await generateExport(body);

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 5. Helix Dashboard Permission Gate
```typescript
// app/[workspaceSlug]/projects/[projectKey]/helix/layout.tsx
'use client';

import React from 'react';
import { useHelixPermissions } from '@/lib/helix/permissions';
import HelixErrorBoundary from '@/components/helix/HelixErrorBoundary';

export default function HelixLayout({ children }: { children: React.ReactNode }) {
  const { canViewHelixProcess } = useHelixPermissions();

  if (!canViewHelixProcess()) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
        <div className="bg-[#1a1d27] border border-red-500 rounded-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You do not have permission to access Helix Mode. Contact a project leader to request access.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-[#00d4ff] hover:bg-[#00a8cc] text-[#0f1117] rounded font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <HelixErrorBoundary level="page">
      {children}
    </HelixErrorBoundary>
  );
}
```

### 6. Permission-Protected Modal/Dialog
```typescript
// components/helix/HelixModeToggle.tsx (with permission gate)
'use client';

import React, { useState } from 'react';
import { useHelixPermissions } from '@/lib/helix/permissions';

export const HelixModeToggle: React.FC = () => {
  const { canToggleHelixMode } = useHelixPermissions();
  const [isLoading, setIsLoading] = useState(false);

  if (!canToggleHelixMode()) {
    return (
      <div className="p-4 bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded">
        <p className="text-yellow-300">
          Only project leaders can enable or disable Helix Mode.
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={() => toggleHelixMode()}
      disabled={isLoading}
      className="px-4 py-2 bg-[#00d4ff] hover:bg-[#00a8cc] text-[#0f1117] rounded font-semibold disabled:bg-gray-700 disabled:text-gray-500"
    >
      {isLoading ? 'Toggling...' : 'Toggle Helix Mode'}
    </button>
  );
};

export default HelixModeToggle;
```

## File Structure
```
lib/permissions/
├── definitions.ts               (UPDATED with Helix permissions)
lib/helix/
├── permissions.ts               (NEW Helix permission utilities)
components/helix/
├── StepDetailView.tsx           (UPDATED with permission checks)
├── StageGateCheck.tsx           (UPDATED with permission checks)
└── HelixModeToggle.tsx          (UPDATED with permission gate)
app/api/helix/
├── step/[stepKey]/complete/route.ts   (UPDATED with auth)
├── gate-check/[gateKey]/override/route.ts (UPDATED with auth)
└── artifacts/export/route.ts    (UPDATED with auth)
app/[workspaceSlug]/projects/[projectKey]/helix/
└── layout.tsx                   (UPDATED with permission gate)
```

## Dependencies
- next-auth (for session management)
- @/types/permissions (role/permission types)
- @/hooks/auth/useAuth (authentication hook)

## Tech Stack
- Next.js 16+ (API routes)
- TypeScript
- next-auth for session management
- React hooks for permission checks

## Acceptance Criteria
1. TOGGLE_HELIX_MODE permission available only to LEADER role
2. COMPLETE_HELIX_STEP permission available to LEADER and DEVELOPER roles
3. OVERRIDE_GATE_CHECK permission available only to LEADER role
4. VIEW_HELIX_PROCESS permission available to LEADER, DEVELOPER, and VIEWER roles
5. EXPORT_HELIX_DATA permission available to LEADER and DEVELOPER roles
6. UI buttons show/hide based on user role (complete button hidden for viewers)
7. API routes reject unauthorized requests with 403 status
8. Helix layout shows access denied message if user lacks VIEW_HELIX_PROCESS
9. Gate override button only shown to leaders
10. Export functionality blocked for users without EXPORT_HELIX_DATA

## Testing Instructions
1. **Login as Viewer**: Navigate to Helix Mode, verify you see "Access Denied"
2. **Login as Developer**: Verify you can view, complete steps, and export
3. **Login as Leader**: Verify you can do all actions including override gates
4. **Guest user**: Attempt API call, verify 401 Unauthorized
5. **Viewer export attempt**: Try to export, verify 403 Forbidden from API
6. **UI button visibility**: Login as different roles, verify buttons appear/disappear
7. **Complete step as viewer**: Try to complete via API, verify 403 Forbidden
8. **Override gate as developer**: Try to override, verify 403 Forbidden
9. **Permission cache**: Change user role, verify UI updates reflect new permissions
10. **Audit trail**: Override a gate, verify action is logged with user and timestamp

## Notes for AI Agent
- Permission checks must happen at both UI and API levels (defense in depth)
- Always validate permissions on the server side—never trust client-side checks alone
- Log all privileged actions (gate override, mode toggle) for audit trail
- Use useHelixPermissions hook in all components that need permission checks
- API routes should return 403 Forbidden for permission errors (not 400 Bad Request)
- Consider caching permission results to avoid repeated permission lookups
- Helix Mode is optional—only shown to users with VIEW_HELIX_PROCESS
- Test with role switching to ensure UI updates correctly
- Document role requirements in UI (show "Leader only" labels)
- Future enhancement: add custom roles with granular permissions
