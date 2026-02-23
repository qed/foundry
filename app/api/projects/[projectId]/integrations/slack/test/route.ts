import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { sendTestSlackNotification } from '@/lib/slack/notifications'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

/**
 * POST /api/projects/[projectId]/integrations/slack/test
 * Send a test notification to the configured Slack webhook.
 */
export async function POST(
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

    const result = await sendTestSlackNotification(projectId)

    if (!result.ok) {
      return Response.json(
        { error: result.error || 'Failed to send test notification' },
        { status: 502 }
      )
    }

    return Response.json({ success: true })
  } catch (err) {
    return handleAuthError(err)
  }
}
