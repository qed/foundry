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
  canAnyPerm: (permissions: (OrgPermission | ProjectPermission)[]) => boolean
  canAllPerm: (permissions: (OrgPermission | ProjectPermission)[]) => boolean
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
    canAnyPerm: (permissions) => canAny(context, permissions),
    canAllPerm: (permissions) => canAll(context, permissions),
  }
}
