import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from './service'
import {
  mentionEmailHtml,
  mentionEmailText,
  commentEmailHtml,
  commentEmailText,
  assignmentEmailHtml,
  assignmentEmailText,
  feedbackEmailHtml,
  feedbackEmailText,
} from './templates'

type NotificationType = 'mention' | 'comment' | 'assignment' | 'feedback'

const TYPE_TO_PREF_KEY: Record<NotificationType, string> = {
  mention: 'email_on_mention',
  comment: 'email_on_comment',
  assignment: 'email_on_assignment',
  feedback: 'email_on_feedback',
}

/**
 * Check if a user has email enabled for a given notification type.
 * Returns true by default if no preferences are stored.
 */
async function isEmailEnabled(userId: string, type: NotificationType): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!data) return true // Default: emails enabled

  const key = TYPE_TO_PREF_KEY[type]
  return (data as Record<string, unknown>)[key] !== false
}

/**
 * Get a user's email address from auth.users via profiles join.
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = createServiceClient()
  // auth.users is not directly queryable via supabase-js client,
  // but we can use the admin API
  const { data } = await supabase.auth.admin.getUserById(userId)
  return data?.user?.email || null
}

/**
 * Get project name for email context.
 */
async function getProjectName(projectId: string): Promise<string> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()
  return data?.name || 'Unknown Project'
}

/**
 * Get display name for a user.
 */
async function getDisplayName(userId: string): Promise<string> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()
  return data?.display_name || 'Someone'
}

// --- Trigger functions (fire-and-forget) ---

export async function sendMentionEmail(params: {
  mentionedUserId: string
  mentionerUserId: string
  projectId: string
  commentPreview: string
  actionUrl: string
}) {
  try {
    if (!(await isEmailEnabled(params.mentionedUserId, 'mention'))) return

    const email = await getUserEmail(params.mentionedUserId)
    if (!email) return

    const [mentionerName, projectName, recipientName] = await Promise.all([
      getDisplayName(params.mentionerUserId),
      getProjectName(params.projectId),
      getDisplayName(params.mentionedUserId),
    ])

    const vars = {
      recipientName,
      projectName,
      mentionerName,
      commentPreview: params.commentPreview.slice(0, 200),
      actionUrl: params.actionUrl,
    }

    await sendEmail({
      to: email,
      subject: `You were mentioned in ${projectName}`,
      html: mentionEmailHtml(vars),
      text: mentionEmailText(vars),
      userId: params.mentionedUserId,
      eventType: 'mention',
      templateName: 'mention',
    })
  } catch (err) {
    console.error('[Email] Mention email failed:', err)
  }
}

export async function sendCommentEmail(params: {
  ownerId: string
  commenterUserId: string
  projectId: string
  entityName: string
  entityType: string
  commentPreview: string
  actionUrl: string
}) {
  try {
    if (!(await isEmailEnabled(params.ownerId, 'comment'))) return

    const email = await getUserEmail(params.ownerId)
    if (!email) return

    const [commenterName, projectName, recipientName] = await Promise.all([
      getDisplayName(params.commenterUserId),
      getProjectName(params.projectId),
      getDisplayName(params.ownerId),
    ])

    const vars = {
      recipientName,
      projectName,
      commenterName,
      entityName: params.entityName,
      entityType: params.entityType,
      commentPreview: params.commentPreview.slice(0, 200),
      actionUrl: params.actionUrl,
    }

    await sendEmail({
      to: email,
      subject: `New comment on ${params.entityName}`,
      html: commentEmailHtml(vars),
      text: commentEmailText(vars),
      userId: params.ownerId,
      eventType: 'comment',
      templateName: 'comment',
    })
  } catch (err) {
    console.error('[Email] Comment email failed:', err)
  }
}

export async function sendAssignmentEmail(params: {
  assigneeUserId: string
  assignerUserId: string
  projectId: string
  workOrderTitle: string
  priority: string
  actionUrl: string
}) {
  try {
    if (!(await isEmailEnabled(params.assigneeUserId, 'assignment'))) return

    const email = await getUserEmail(params.assigneeUserId)
    if (!email) return

    const [assignerName, projectName, recipientName] = await Promise.all([
      getDisplayName(params.assignerUserId),
      getProjectName(params.projectId),
      getDisplayName(params.assigneeUserId),
    ])

    const vars = {
      recipientName,
      projectName,
      assignerName,
      workOrderTitle: params.workOrderTitle,
      priority: params.priority,
      actionUrl: params.actionUrl,
    }

    await sendEmail({
      to: email,
      subject: `Assigned: ${params.workOrderTitle}`,
      html: assignmentEmailHtml(vars),
      text: assignmentEmailText(vars),
      userId: params.assigneeUserId,
      eventType: 'assignment',
      templateName: 'assignment',
    })
  } catch (err) {
    console.error('[Email] Assignment email failed:', err)
  }
}

export async function sendFeedbackEmail(params: {
  recipientUserId: string
  projectId: string
  feedbackPreview: string
  category: string
  actionUrl: string
}) {
  try {
    if (!(await isEmailEnabled(params.recipientUserId, 'feedback'))) return

    const email = await getUserEmail(params.recipientUserId)
    if (!email) return

    const [projectName, recipientName] = await Promise.all([
      getProjectName(params.projectId),
      getDisplayName(params.recipientUserId),
    ])

    const vars = {
      recipientName,
      projectName,
      feedbackPreview: params.feedbackPreview.slice(0, 200),
      category: params.category,
      actionUrl: params.actionUrl,
    }

    await sendEmail({
      to: email,
      subject: `New ${params.category} feedback in ${projectName}`,
      html: feedbackEmailHtml(vars),
      text: feedbackEmailText(vars),
      userId: params.recipientUserId,
      eventType: 'feedback',
      templateName: 'feedback',
    })
  } catch (err) {
    console.error('[Email] Feedback email failed:', err)
  }
}
