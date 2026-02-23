import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { logActivity } from '@/lib/activity/logging'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

/**
 * GET /api/projects/[projectId]/integrations/slack
 * Fetch Slack integration config for this project.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const supabase = createServiceClient()

    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: config } = await supabase
      .from('slack_integrations')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (!config) {
      return Response.json({ config: null })
    }

    // Mask webhook URL for non-leaders
    const { data: memberRole } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    return Response.json({
      config: {
        ...config,
        webhook_url: memberRole?.role === 'leader'
          ? config.webhook_url
          : config.webhook_url.replace(/\/[^/]+$/, '/****'),
      },
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * PUT /api/projects/[projectId]/integrations/slack
 * Create or update Slack integration config. Leaders only.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const {
      webhookUrl,
      channelName,
      notifyCritical,
      notifyHighScore,
      highScoreThreshold,
      notifyCategories,
      isActive,
    } = body as {
      webhookUrl: string
      channelName?: string
      notifyCritical?: boolean
      notifyHighScore?: boolean
      highScoreThreshold?: number
      notifyCategories?: string[]
      isActive?: boolean
    }

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return Response.json({ error: 'Webhook URL is required' }, { status: 400 })
    }

    // Basic URL validation
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return Response.json(
        { error: 'Invalid Slack webhook URL. Must start with https://hooks.slack.com/' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Verify leader access
    const { data: membership } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'leader') {
      return Response.json({ error: 'Only project leaders can configure integrations' }, { status: 403 })
    }

    const threshold = Math.max(50, Math.min(100, highScoreThreshold ?? 75))

    // Upsert
    const { data: config, error } = await supabase
      .from('slack_integrations')
      .upsert(
        {
          project_id: projectId,
          webhook_url: webhookUrl,
          channel_name: channelName || null,
          notify_critical: notifyCritical ?? true,
          notify_high_score: notifyHighScore ?? false,
          high_score_threshold: threshold,
          notify_categories: notifyCategories ?? [],
          is_active: isActive ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving Slack config:', error)
      return Response.json({ error: 'Failed to save configuration' }, { status: 500 })
    }

    logActivity({
      projectId,
      userId: user.id,
      entityType: 'project',
      entityId: projectId,
      action: 'updated_slack_integration',
      details: { is_active: config.is_active },
    })

    return Response.json({ config })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * DELETE /api/projects/[projectId]/integrations/slack
 * Remove Slack integration. Leaders only.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const supabase = createServiceClient()

    const { data: membership } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'leader') {
      return Response.json({ error: 'Only project leaders can remove integrations' }, { status: 403 })
    }

    await supabase
      .from('slack_integrations')
      .delete()
      .eq('project_id', projectId)

    logActivity({
      projectId,
      userId: user.id,
      entityType: 'project',
      entityId: projectId,
      action: 'removed_slack_integration',
      details: {},
    })

    return Response.json({ success: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
