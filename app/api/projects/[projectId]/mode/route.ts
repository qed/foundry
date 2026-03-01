import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { HELIX_STAGES } from '@/config/helix-process'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const supabase = await createClient()
  const { data: project, error } = await supabase
    .from('projects')
    .select('mode')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({ mode: project.mode })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const body = await request.json()
  const { mode } = body

  if (mode !== 'open' && mode !== 'helix') {
    return NextResponse.json({ error: 'Invalid mode. Must be "open" or "helix".' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify user has access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service client for writes (projects table has no user UPDATE RLS policy)
  const serviceClient = createServiceClient()

  // Update project mode
  const { error: updateError } = await serviceClient
    .from('projects')
    .update({ mode, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (updateError) {
    console.error('Failed to update project mode:', updateError)
    return NextResponse.json({ error: 'Failed to update project mode' }, { status: 500 })
  }

  // Initialize helix data when switching to helix mode
  if (mode === 'helix') {
    // Derive steps from config
    const helixSteps = HELIX_STAGES.flatMap((stage) =>
      stage.steps.map((step) => ({
        stage_number: step.stageNumber,
        step_number: step.stepNumber,
        step_key: step.key,
        evidence_type: step.evidenceRequirements[0]?.type ?? 'text',
      }))
    )

    // Delete any existing stale rows and reinitialize
    await serviceClient
      .from('helix_steps')
      .delete()
      .eq('project_id', projectId)

    await serviceClient
      .from('helix_stage_gates')
      .delete()
      .eq('project_id', projectId)

    // Initialize steps
    const { error: stepsError } = await serviceClient
      .from('helix_steps')
      .insert(
        helixSteps.map((step) => ({
          project_id: projectId,
          ...step,
          status: step.step_key === '1.1' ? ('active' as const) : ('locked' as const),
          evidence_data: null,
        }))
      )

    if (stepsError) {
      console.error('Failed to initialize helix steps:', stepsError)
      return NextResponse.json({ error: 'Failed to initialize helix steps' }, { status: 500 })
    }

    // Initialize stage gates
    const { error: gatesError } = await serviceClient
      .from('helix_stage_gates')
      .insert(
        Array.from({ length: 8 }, (_, i) => ({
          project_id: projectId,
          stage_number: i + 1,
          status: i === 0 ? ('active' as const) : ('locked' as const),
        }))
      )

    if (gatesError) {
      console.error('Failed to initialize stage gates:', gatesError)
      return NextResponse.json({ error: 'Failed to initialize stage gates' }, { status: 500 })
    }
  }

  return NextResponse.json({ mode })
}
