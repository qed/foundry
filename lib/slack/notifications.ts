import { createServiceClient } from '@/lib/supabase/server'

interface SlackConfig {
  id: string
  webhook_url: string
  channel_name: string | null
  notify_critical: boolean
  notify_high_score: boolean
  high_score_threshold: number
  notify_categories: string[]
  is_active: boolean
}

interface FeedbackForSlack {
  id: string
  project_id: string
  content: string
  submitter_name: string | null
  submitter_email: string | null
  category: string
  score: number | null
  status: string
  created_at: string
}

/**
 * Format a Slack message payload for a feedback notification.
 */
function formatFeedbackMessage(
  feedback: FeedbackForSlack,
  projectName: string,
  baseUrl: string
): object {
  const score = feedback.score ?? 0
  const isCritical = score >= 90
  const emoji = isCritical ? ':rotating_light:' : ':mega:'
  const label = isCritical ? 'Critical Feedback' : 'New High-Priority Feedback'
  const preview = feedback.content.length > 200
    ? feedback.content.slice(0, 200) + '...'
    : feedback.content

  const author = feedback.submitter_name || feedback.submitter_email || 'Anonymous'
  const category = feedback.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const feedbackUrl = `${baseUrl}/lab?feedback=${feedback.id}`

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${emoji} ${label}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Project:*\n${projectName}` },
          { type: 'mrkdwn', text: `*Score:*\n${score}/100` },
          { type: 'mrkdwn', text: `*Category:*\n${category}` },
          { type: 'mrkdwn', text: `*Author:*\n${author}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `> ${preview}` },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in Insights Lab' },
            url: feedbackUrl,
            style: 'primary',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Status: *${feedback.status}* | Sent from Helix Foundry` },
        ],
      },
    ],
  }
}

/**
 * Format a test notification message.
 */
function formatTestMessage(projectName: string): object {
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':white_check_mark: Helix Foundry — Test Notification', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Slack integration is working for project *${projectName}*.\nYou will receive notifications for feedback matching your configured rules.`,
        },
      },
    ],
  }
}

/**
 * Send a message to a Slack webhook URL.
 * Returns { ok, status, error }.
 */
async function sendToWebhook(
  webhookUrl: string,
  payload: object
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) return { ok: true, status: res.status }

    const text = await res.text().catch(() => 'Unknown error')
    return { ok: false, status: res.status, error: text }
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * Send a test notification to the project's configured Slack webhook.
 */
export async function sendTestSlackNotification(
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceClient()

  const { data: config } = await supabase
    .from('slack_integrations')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (!config || !config.is_active) {
    return { ok: false, error: 'Slack integration not configured or inactive' }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  const payload = formatTestMessage(project?.name || 'Unknown Project')
  return sendToWebhook(config.webhook_url, payload)
}

/**
 * Check feedback against Slack notification rules and send if matched.
 * Fire-and-forget — never throws.
 */
export async function notifySlackOnFeedback(feedbackId: string): Promise<void> {
  try {
    const supabase = createServiceClient()

    // Fetch feedback
    const { data: feedback } = await supabase
      .from('feedback_submissions')
      .select('id, project_id, content, submitter_name, submitter_email, category, score, status, created_at')
      .eq('id', feedbackId)
      .single()

    if (!feedback) return

    // Fetch Slack config for this project
    const { data: config } = await supabase
      .from('slack_integrations')
      .select('*')
      .eq('project_id', feedback.project_id)
      .eq('is_active', true)
      .single()

    if (!config) return

    const slackConfig = config as SlackConfig
    const score = feedback.score ?? 0

    // Check rules
    let shouldNotify = false

    // Critical feedback (score >= 90)
    if (slackConfig.notify_critical && score >= 90) {
      shouldNotify = true
    }

    // High-score feedback
    if (slackConfig.notify_high_score && score >= slackConfig.high_score_threshold) {
      shouldNotify = true
    }

    // Category match
    if (slackConfig.notify_categories.length > 0 && slackConfig.notify_categories.includes(feedback.category)) {
      shouldNotify = true
    }

    if (!shouldNotify) return

    // Fetch project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', feedback.project_id)
      .single()

    // Build base URL (use env or fallback)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
    const payload = formatFeedbackMessage(
      feedback as FeedbackForSlack,
      project?.name || 'Unknown',
      baseUrl
    )

    const result = await sendToWebhook(slackConfig.webhook_url, payload)

    // Log notification
    await supabase.from('slack_notifications_sent').insert({
      project_id: feedback.project_id,
      feedback_id: feedback.id,
      message_type: 'feedback',
      response_status: result.ok ? 'sent' : 'failed',
      error_message: result.error || null,
    })
  } catch (err) {
    console.error('[slack] Failed to send notification:', err)
  }
}
