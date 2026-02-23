import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { logActivity } from '@/lib/activity/logging'

const MAX_INSTRUCTIONS_LENGTH = 2000

interface RouteParams {
  params: Promise<{ projectId: string }>
}

/**
 * GET /api/projects/[projectId]/settings/agent-instructions
 * Fetch current agent writing instructions for a project.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('agent_writing_instructions, agent_writing_instructions_updated_at')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    return Response.json({
      instructions: project.agent_writing_instructions,
      updatedAt: project.agent_writing_instructions_updated_at,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * PATCH /api/projects/[projectId]/settings/agent-instructions
 * Update agent writing instructions. Leaders only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { instructions } = body as { instructions?: string | null }

    // Validate length
    if (instructions && instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      return Response.json(
        { error: `Instructions must be ${MAX_INSTRUCTIONS_LENGTH} characters or less` },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Verify project membership (leader only)
    const { data: membership } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (membership.role !== 'leader') {
      return Response.json(
        { error: 'Only project leaders can update agent instructions' },
        { status: 403 }
      )
    }

    // Sanitize: strip HTML tags
    const sanitized = instructions
      ? instructions.replace(/<[^>]*>/g, '').trim() || null
      : null

    const updatedAt = sanitized ? new Date().toISOString() : null

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        agent_writing_instructions: sanitized,
        agent_writing_instructions_updated_at: updatedAt,
      })
      .eq('id', projectId)

    if (updateError) {
      console.error('Error updating agent instructions:', updateError)
      return Response.json({ error: 'Failed to update instructions' }, { status: 500 })
    }

    // Log activity (fire-and-forget)
    logActivity({
      projectId,
      userId: user.id,
      entityType: 'project',
      entityId: projectId,
      action: 'updated_agent_writing_instructions',
      details: { has_instructions: !!sanitized },
    })

    return Response.json({
      success: true,
      instructions: sanitized,
      updatedAt,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
