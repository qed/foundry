import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/projects/[projectId]/phases/apply-plan
 * Apply a suggested phase plan: create phases and assign work orders.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const { phases: planPhases } = body as {
      phases: Array<{
        name: string
        description?: string
        work_order_ids: string[]
      }>
    }

    if (!planPhases || !Array.isArray(planPhases) || planPhases.length === 0) {
      return Response.json({ error: 'phases array is required' }, { status: 400 })
    }

    if (planPhases.length > 20) {
      return Response.json({ error: 'Maximum 20 phases per plan' }, { status: 400 })
    }

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

    // Get current max phase position
    const { data: maxPhase } = await supabase
      .from('phases')
      .select('position')
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    let nextPosition = (maxPhase?.position ?? -1) + 1

    let phasesCreated = 0
    let workOrdersAssigned = 0

    for (const planPhase of planPhases) {
      const name = (planPhase.name || '').trim()
      if (!name || name.length > 100) continue

      // Create the phase
      const { data: createdPhase, error: phaseErr } = await supabase
        .from('phases')
        .insert({
          project_id: projectId,
          name,
          description: planPhase.description?.trim() || null,
          position: nextPosition++,
          status: 'planned' as const,
        })
        .select('id')
        .single()

      if (phaseErr || !createdPhase) {
        console.error('Error creating phase:', phaseErr)
        continue
      }

      phasesCreated++

      // Assign work orders to this phase
      if (planPhase.work_order_ids && planPhase.work_order_ids.length > 0) {
        const { error: assignErr, count } = await supabase
          .from('work_orders')
          .update({ phase_id: createdPhase.id })
          .eq('project_id', projectId)
          .in('id', planPhase.work_order_ids)

        if (!assignErr && count) {
          workOrdersAssigned += count
        } else if (!assignErr) {
          // count may be null — estimate from array length
          workOrdersAssigned += planPhase.work_order_ids.length
        }

        // Log activity for each assigned work order
        const activityRows = planPhase.work_order_ids.map((woId) => ({
          work_order_id: woId,
          user_id: user.id,
          action: 'phase_changed',
          details: { to: createdPhase.id, source: 'agent_phase_plan', phase_name: name },
        }))

        await supabase.from('work_order_activity').insert(activityRows)
      }
    }

    return Response.json({
      success: true,
      phases_created: phasesCreated,
      work_orders_assigned: workOrdersAssigned,
    }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
