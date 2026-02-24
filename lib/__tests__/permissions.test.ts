import { describe, it, expect } from 'vitest'
import {
  canOrgPermission,
  canProjectPermission,
  canAll,
  canAny,
} from '@/lib/permissions/checker'
import { OrgPermissions, ProjectPermissions } from '@/lib/permissions/definitions'

describe('canOrgPermission', () => {
  it('admin has all org permissions', () => {
    expect(canOrgPermission('admin', OrgPermissions.MANAGE_ORG)).toBe(true)
    expect(canOrgPermission('admin', OrgPermissions.MANAGE_MEMBERS)).toBe(true)
    expect(canOrgPermission('admin', OrgPermissions.CREATE_PROJECT)).toBe(true)
    expect(canOrgPermission('admin', OrgPermissions.DELETE_PROJECT)).toBe(true)
    expect(canOrgPermission('admin', OrgPermissions.EDIT_BILLING)).toBe(true)
  })

  it('member has no org permissions', () => {
    expect(canOrgPermission('member', OrgPermissions.MANAGE_ORG)).toBe(false)
    expect(canOrgPermission('member', OrgPermissions.CREATE_PROJECT)).toBe(false)
    expect(canOrgPermission('member', OrgPermissions.EDIT_BILLING)).toBe(false)
  })
})

describe('canProjectPermission', () => {
  it('leader has management and view permissions', () => {
    expect(canProjectPermission('leader', ProjectPermissions.MANAGE_PROJECT)).toBe(true)
    expect(canProjectPermission('leader', ProjectPermissions.VIEW_REQUIREMENTS)).toBe(true)
    expect(canProjectPermission('leader', ProjectPermissions.VIEW_DASHBOARD)).toBe(true)
  })

  it('leader cannot create or edit content', () => {
    expect(canProjectPermission('leader', ProjectPermissions.CREATE_REQUIREMENT)).toBe(false)
    expect(canProjectPermission('leader', ProjectPermissions.EDIT_BLUEPRINT)).toBe(false)
    expect(canProjectPermission('leader', ProjectPermissions.CREATE_WORK_ORDER)).toBe(false)
  })

  it('developer can create and edit content', () => {
    expect(canProjectPermission('developer', ProjectPermissions.CREATE_REQUIREMENT)).toBe(true)
    expect(canProjectPermission('developer', ProjectPermissions.EDIT_BLUEPRINT)).toBe(true)
    expect(canProjectPermission('developer', ProjectPermissions.CREATE_WORK_ORDER)).toBe(true)
  })

  it('developer cannot manage project or team', () => {
    expect(canProjectPermission('developer', ProjectPermissions.MANAGE_PROJECT)).toBe(false)
    expect(canProjectPermission('developer', ProjectPermissions.MANAGE_TEAM)).toBe(false)
  })

  it('developer cannot export data', () => {
    expect(canProjectPermission('developer', ProjectPermissions.EXPORT_DATA)).toBe(false)
  })
})

describe('canAll', () => {
  it('returns true when all org permissions are met', () => {
    const result = canAll(
      { orgRole: 'admin' },
      [OrgPermissions.MANAGE_ORG, OrgPermissions.CREATE_PROJECT]
    )
    expect(result).toBe(true)
  })

  it('returns false when any org permission is missing', () => {
    const result = canAll(
      { orgRole: 'member' },
      [OrgPermissions.MANAGE_ORG, OrgPermissions.CREATE_PROJECT]
    )
    expect(result).toBe(false)
  })

  it('checks project permissions when projectRole is provided', () => {
    const result = canAll(
      { orgRole: 'member', projectRole: 'developer' },
      [ProjectPermissions.CREATE_REQUIREMENT, ProjectPermissions.EDIT_REQUIREMENT]
    )
    expect(result).toBe(true)
  })

  it('returns false for project permissions without projectRole', () => {
    const result = canAll(
      { orgRole: 'admin' },
      [ProjectPermissions.CREATE_REQUIREMENT]
    )
    expect(result).toBe(false)
  })

  it('handles mixed org and project permissions', () => {
    const result = canAll(
      { orgRole: 'admin', projectRole: 'developer' },
      [OrgPermissions.MANAGE_ORG, ProjectPermissions.VIEW_REQUIREMENTS]
    )
    expect(result).toBe(true)
  })

  it('returns true for empty permissions array', () => {
    expect(canAll({ orgRole: 'member' }, [])).toBe(true)
  })
})

describe('canAny', () => {
  it('returns true when at least one permission is met', () => {
    const result = canAny(
      { orgRole: 'admin' },
      [OrgPermissions.MANAGE_ORG, OrgPermissions.EDIT_BILLING]
    )
    expect(result).toBe(true)
  })

  it('returns false when no permissions are met', () => {
    const result = canAny(
      { orgRole: 'member' },
      [OrgPermissions.MANAGE_ORG, OrgPermissions.EDIT_BILLING]
    )
    expect(result).toBe(false)
  })

  it('returns true with mixed permissions if any match', () => {
    const result = canAny(
      { orgRole: 'member', projectRole: 'developer' },
      [OrgPermissions.MANAGE_ORG, ProjectPermissions.CREATE_REQUIREMENT]
    )
    expect(result).toBe(true)
  })

  it('returns false for empty permissions array', () => {
    expect(canAny({ orgRole: 'admin' }, [])).toBe(false)
  })
})
