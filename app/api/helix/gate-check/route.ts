import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canCompleteStep, canActivateStep, canPassStageGate } from '@/lib/helix/gate-check'

/**
 * POST /api/helix/gate-check
 *
 * Body: { projectId, checkType, stepKey?, stageNumber? }
 * checkType: 'complete-step' | 'activate-step' | 'pass-gate'
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { projectId, checkType, stepKey, stageNumber } = body as {
    projectId: string
    checkType: 'complete-step' | 'activate-step' | 'pass-gate'
    stepKey?: string
    stageNumber?: number
  }

  if (!projectId || !checkType) {
    return NextResponse.json(
      { error: 'Missing required fields: projectId, checkType' },
      { status: 400 }
    )
  }

  // Verify user has access to the project
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Not a project member' }, { status: 403 })
  }

  try {
    switch (checkType) {
      case 'complete-step': {
        if (!stepKey) {
          return NextResponse.json({ error: 'stepKey is required for complete-step' }, { status: 400 })
        }
        const result = await canCompleteStep(projectId, stepKey)
        return NextResponse.json(result)
      }
      case 'activate-step': {
        if (!stepKey) {
          return NextResponse.json({ error: 'stepKey is required for activate-step' }, { status: 400 })
        }
        const result = await canActivateStep(projectId, stepKey)
        return NextResponse.json(result)
      }
      case 'pass-gate': {
        if (stageNumber === undefined) {
          return NextResponse.json({ error: 'stageNumber is required for pass-gate' }, { status: 400 })
        }
        const result = await canPassStageGate(projectId, stageNumber)
        return NextResponse.json(result)
      }
      default:
        return NextResponse.json({ error: 'Invalid checkType' }, { status: 400 })
    }
  } catch (err) {
    console.error('Gate check error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
