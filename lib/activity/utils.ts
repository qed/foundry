/**
 * Format an action string into a human-readable message.
 */
export function formatAction(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ')
}

const ACTION_LABELS: Record<string, string> = {
  // Create
  idea_created: 'created an idea',
  feature_created: 'created a feature',
  blueprint_created: 'created a blueprint',
  work_order_created: 'created a work order',
  feedback_created: 'submitted feedback',
  requirement_document_created: 'created a requirement doc',
  artifact_uploaded: 'uploaded an artifact',
  comment_created: 'added a comment',
  tag_created: 'created a tag',
  // Update
  idea_updated: 'updated an idea',
  feature_updated: 'updated a feature',
  blueprint_updated: 'updated a blueprint',
  work_order_updated: 'updated a work order',
  feedback_updated: 'updated feedback',
  requirement_document_updated: 'updated a requirement doc',
  artifact_moved: 'moved an artifact',
  comment_edited: 'edited a comment',
  tag_updated: 'updated a tag',
  // Delete
  idea_deleted: 'deleted an idea',
  feature_deleted: 'deleted a feature',
  blueprint_deleted: 'deleted a blueprint',
  work_order_deleted: 'deleted a work order',
  feedback_deleted: 'deleted feedback',
  artifact_deleted: 'deleted an artifact',
  comment_deleted: 'deleted a comment',
  tag_deleted: 'deleted a tag',
  // Status
  feature_status_changed: 'changed feature status',
  work_order_status_changed: 'changed work order status',
  feedback_severity_changed: 'changed feedback severity',
  // Collaboration
  member_added: 'added a member',
  member_removed: 'removed a member',
  member_role_changed: 'changed a member role',
  project_archived: 'archived the project',
  project_restored: 'restored the project',
  connection_created: 'created a connection',
  connection_removed: 'removed a connection',
  version_restored: 'restored a version',
  // Other
  settings_updated: 'updated settings',
  invitation_sent: 'sent an invitation',
  invitation_accepted: 'accepted an invitation',
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  idea: 'Idea',
  feature_node: 'Feature',
  requirement_doc: 'Requirement',
  blueprint: 'Blueprint',
  work_order: 'Work Order',
  feedback: 'Feedback',
  artifact: 'Artifact',
  comment: 'Comment',
  member: 'Member',
  project: 'Project',
  connection: 'Connection',
  tag: 'Tag',
  phase: 'Phase',
}

export function formatEntityType(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] || entityType.replace(/_/g, ' ')
}

/**
 * Get a CSS color class for an action category.
 */
export function getActionColor(action: string): string {
  if (action.includes('created') || action.includes('uploaded')) return 'text-accent-success'
  if (action.includes('deleted') || action.includes('removed')) return 'text-accent-error'
  if (action.includes('updated') || action.includes('changed') || action.includes('edited')) return 'text-accent-cyan'
  if (action.includes('archived')) return 'text-accent-warning'
  return 'text-text-secondary'
}
