import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { logActivity } from '@/lib/activity/logging'

const VALID_STRATEGIES = ['feature-slice', 'specialist', 'custom'] as const
const MAX_INSTRUCTIONS_LENGTH = 1500

interface RouteParams {
  params: Promise<{ projectId: string }>
}

/**
 * GET /api/projects/[projectId]/settings/extraction-strategy
 * Get the project's extraction strategy config.
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
      .select('extraction_strategy, extraction_instructions, extraction_strategy_updated_at')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    return Response.json({
      strategy: project.extraction_strategy || 'feature-slice',
      instructions: project.extraction_instructions,
      updated_at: project.extraction_strategy_updated_at,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * PATCH /api/projects/[projectId]/settings/extraction-strategy
 * Update the project's extraction strategy.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { strategy, instructions } = body as {
      strategy: string
      instructions?: string | null
    }

    // Validate strategy
    if (!VALID_STRATEGIES.includes(strategy as typeof VALID_STRATEGIES[number])) {
      return Response.json(
        { error: `Invalid strategy. Must be one of: ${VALID_STRATEGIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate instructions for custom strategy
    if (strategy === 'custom') {
      if (!instructions || instructions.trim().length === 0) {
        return Response.json(
          { error: 'Instructions are required for custom strategy' },
          { status: 400 }
        )
      }
      if (instructions.length > MAX_INSTRUCTIONS_LENGTH) {
        return Response.json(
          { error: `Instructions must be ${MAX_INSTRUCTIONS_LENGTH} characters or less` },
          { status: 400 }
        )
      }
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
        { error: 'Only project leaders can change extraction strategy' },
        { status: 403 }
      )
    }

    // Sanitize instructions — strip HTML tags
    const sanitizedInstructions = strategy === 'custom' && instructions
      ? instructions.replace(/<[^>]*>/g, '').trim()
      : null

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        extraction_strategy: strategy as 'feature-slice' | 'specialist' | 'custom',
        extraction_instructions: sanitizedInstructions,
        extraction_strategy_updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (updateError) {
      console.error('Error updating extraction strategy:', updateError)
      return Response.json({ error: 'Failed to update strategy' }, { status: 500 })
    }

    // Log activity (fire-and-forget)
    logActivity({
      projectId,
      userId: user.id,
      entityType: 'project',
      entityId: projectId,
      action: 'updated_extraction_strategy',
      details: { strategy, has_instructions: !!sanitizedInstructions },
    })

    return Response.json({
      success: true,
      strategy,
      instructions: sanitizedInstructions,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
