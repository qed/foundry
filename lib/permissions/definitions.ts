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
export type ProjectPermission =
  (typeof ProjectPermissions)[keyof typeof ProjectPermissions]

/**
 * Define which permissions each org role has
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
  member: [],
}

/**
 * Define which permissions each project role has
 */
export const ProjectRolePermissions: Record<
  'leader' | 'developer',
  ProjectPermission[]
> = {
  leader: [
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
