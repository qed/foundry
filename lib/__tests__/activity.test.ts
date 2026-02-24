import { describe, it, expect } from 'vitest'
import { formatAction, formatEntityType, getActionColor } from '@/lib/activity/utils'

describe('formatAction', () => {
  it('formats known actions', () => {
    expect(formatAction('idea_created')).toBe('created an idea')
    expect(formatAction('blueprint_updated')).toBe('updated a blueprint')
    expect(formatAction('work_order_deleted')).toBe('deleted a work order')
    expect(formatAction('member_added')).toBe('added a member')
  })

  it('falls back to replacing underscores for unknown actions', () => {
    expect(formatAction('custom_action_name')).toBe('custom action name')
  })
})

describe('formatEntityType', () => {
  it('formats known entity types', () => {
    expect(formatEntityType('idea')).toBe('Idea')
    expect(formatEntityType('feature_node')).toBe('Feature')
    expect(formatEntityType('work_order')).toBe('Work Order')
    expect(formatEntityType('blueprint')).toBe('Blueprint')
  })

  it('falls back for unknown types', () => {
    expect(formatEntityType('custom_type')).toBe('custom type')
  })
})

describe('getActionColor', () => {
  it('returns success color for create/upload actions', () => {
    expect(getActionColor('idea_created')).toBe('text-accent-success')
    expect(getActionColor('artifact_uploaded')).toBe('text-accent-success')
  })

  it('returns error color for delete/remove actions', () => {
    expect(getActionColor('idea_deleted')).toBe('text-accent-error')
    expect(getActionColor('member_removed')).toBe('text-accent-error')
  })

  it('returns cyan for update/change/edit actions', () => {
    expect(getActionColor('blueprint_updated')).toBe('text-accent-cyan')
    expect(getActionColor('feature_status_changed')).toBe('text-accent-cyan')
    expect(getActionColor('comment_edited')).toBe('text-accent-cyan')
  })

  it('returns warning for archive actions', () => {
    expect(getActionColor('project_archived')).toBe('text-accent-warning')
  })

  it('returns secondary for other actions', () => {
    expect(getActionColor('invitation_sent')).toBe('text-text-secondary')
  })
})
