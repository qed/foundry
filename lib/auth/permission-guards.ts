import { ForbiddenError } from './errors'
import {
  getOrgAndValidateAccess,
  getProjectAndValidateAccess,
} from './org-validation'
import {
  type OrgPermission,
  type ProjectPermission,
} from '@/lib/permissions/definitions'
import {
  canOrgPermission,
  canProjectPermission,
} from '@/lib/permissions/checker'

/**
 * Require specific org permission or throw ForbiddenError
 */
export async function requireOrgPermission(
  orgId: string,
  permission: OrgPermission
) {
  const { role, org, user } = await getOrgAndValidateAccess(orgId)

  if (!canOrgPermission(role, permission)) {
    throw new ForbiddenError(`You do not have permission: ${permission}`)
  }

  return { orgId, org, user, role }
}

/**
 * Require specific project permission or throw ForbiddenError
 */
export async function requireProjectPermission(
  projectId: string,
  permission: ProjectPermission
) {
  const { projectRole, project, user } =
    await getProjectAndValidateAccess(projectId)

  if (!canProjectPermission(projectRole, permission)) {
    throw new ForbiddenError(`You do not have permission: ${permission}`)
  }

  return { projectId, project, user, projectRole }
}

/**
 * Require multiple org permissions (AND logic)
 */
export async function requireAllOrgPermissions(
  orgId: string,
  permissions: OrgPermission[]
) {
  const { role, org, user } = await getOrgAndValidateAccess(orgId)

  const allPermitted = permissions.every((p) => canOrgPermission(role, p))

  if (!allPermitted) {
    throw new ForbiddenError('You do not have required permissions')
  }

  return { orgId, org, user, role }
}

/**
 * Require multiple project permissions (AND logic)
 */
export async function requireAllProjectPermissions(
  projectId: string,
  permissions: ProjectPermission[]
) {
  const { projectRole, project, user } =
    await getProjectAndValidateAccess(projectId)

  const allPermitted = permissions.every((p) =>
    canProjectPermission(projectRole, p)
  )

  if (!allPermitted) {
    throw new ForbiddenError('You do not have required permissions')
  }

  return { projectId, project, user, projectRole }
}
