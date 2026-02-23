import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type NotificationInsert = Database['public']['Tables']['notifications']['Insert']

interface CreateNotificationParams {
  userId: string
  projectId: string
  type: NotificationInsert['type']
  title: string
  body?: string
  linkUrl?: string
  sourceEntityType?: string
  sourceEntityId?: string
  triggeredByUserId?: string
}

/**
 * Create a notification for a user. Fire-and-forget — errors are logged, not thrown.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    // Don't notify users about their own actions
    if (params.triggeredByUserId && params.triggeredByUserId === params.userId) {
      return
    }

    const supabase = createServiceClient()

    await supabase.from('notifications').insert({
      user_id: params.userId,
      project_id: params.projectId,
      type: params.type,
      title: params.title,
      body: params.body || null,
      link_url: params.linkUrl || null,
      source_entity_type: params.sourceEntityType || null,
      source_entity_id: params.sourceEntityId || null,
      triggered_by_user_id: params.triggeredByUserId || null,
    })
  } catch (err) {
    console.error('Failed to create notification:', err)
  }
}

/**
 * Create notifications for all mentioned users in a comment.
 */
export async function notifyMentionedUsers(params: {
  projectId: string
  commentId: string
  commentAuthorId: string
  commentAuthorName: string
  entityType: string
  entityId: string
  mentionedUserIds: string[]
  linkUrl: string
}) {
  for (const userId of params.mentionedUserIds) {
    await createNotification({
      userId,
      projectId: params.projectId,
      type: 'mention',
      title: 'You were mentioned',
      body: `${params.commentAuthorName} mentioned you in a comment`,
      linkUrl: params.linkUrl,
      sourceEntityType: 'comment',
      sourceEntityId: params.commentId,
      triggeredByUserId: params.commentAuthorId,
    })
  }
}

/**
 * Create a notification for the entity owner when someone comments on their entity.
 */
export async function notifyEntityOwner(params: {
  ownerId: string
  projectId: string
  commentId: string
  commentAuthorId: string
  commentAuthorName: string
  entityType: string
  entityId: string
  entityName: string
  linkUrl: string
}) {
  await createNotification({
    userId: params.ownerId,
    projectId: params.projectId,
    type: 'comment',
    title: `New comment on ${params.entityName}`,
    body: `${params.commentAuthorName} commented on your ${params.entityType.replace('_', ' ')}`,
    linkUrl: params.linkUrl,
    sourceEntityType: params.entityType,
    sourceEntityId: params.entityId,
    triggeredByUserId: params.commentAuthorId,
  })
}
