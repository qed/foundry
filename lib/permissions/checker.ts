import {
  OrgPermissions,
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
export interface PermissionContext {
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
    if (
      Object.values(OrgPermissions).includes(permission as OrgPermission)
    ) {
      return canOrgPermission(context.orgRole, permission as OrgPermission)
    }

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
    if (
      Object.values(OrgPermissions).includes(permission as OrgPermission)
    ) {
      return canOrgPermission(context.orgRole, permission as OrgPermission)
    }

    if (context.projectRole) {
      return canProjectPermission(
        context.projectRole,
        permission as ProjectPermission
      )
    }

    return false
  })
}
