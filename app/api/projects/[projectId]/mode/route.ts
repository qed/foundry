import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Temporary step definitions - will be replaced by Phase 005 config
const HELIX_STEPS = [
  { stage_number: 1, step_number: 1, step_key: '1.1', evidence_type: 'text' as const },
  { stage_number: 1, step_number: 2, step_key: '1.2', evidence_type: 'text' as const },
  { stage_number: 1, step_number: 3, step_key: '1.3', evidence_type: 'text' as const },
  { stage_number: 2, step_number: 1, step_key: '2.1', evidence_type: 'text' as const },
  { stage_number: 2, step_number: 2, step_key: '2.2', evidence_type: 'checklist' as const },
  { stage_number: 2, step_number: 3, step_key: '2.3', evidence_type: 'text' as const },
  { stage_number: 3, step_number: 1, step_key: '3.1', evidence_type: 'text' as const },
  { stage_number: 3, step_number: 2, step_key: '3.2', evidence_type: 'text' as const },
  { stage_number: 3, step_number: 3, step_key: '3.3', evidence_type: 'text' as const },
  { stage_number: 4, step_number: 1, step_key: '4.1', evidence_type: 'text' as const },
  { stage_number: 4, step_number: 2, step_key: '4.2', evidence_type: 'file' as const },
  { stage_number: 4, step_number: 3, step_key: '4.3', evidence_type: 'text' as const },
  { stage_number: 5, step_number: 1, step_key: '5.1', evidence_type: 'text' as const },
  { stage_number: 5, step_number: 2, step_key: '5.2', evidence_type: 'checklist' as const },
  { stage_number: 5, step_number: 3, step_key: '5.3', evidence_type: 'text' as const },
  { stage_number: 6, step_number: 1, step_key: '6.1', evidence_type: 'text' as const },
  { stage_number: 6, step_number: 2, step_key: '6.2', evidence_type: 'checklist' as const },
  { stage_number: 6, step_number: 3, step_key: '6.3', evidence_type: 'text' as const },
  { stage_number: 7, step_number: 1, step_key: '7.1', evidence_type: 'text' as const },
  { stage_number: 7, step_number: 2, step_key: '7.2', evidence_type: 'text' as const },
  { stage_number: 8, step_number: 1, step_key: '8.1', evidence_type: 'checklist' as const },
  { stage_number: 8, step_number: 2, step_key: '8.2', evidence_type: 'text' as const },
]

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

  // Update project mode
  const { error: updateError } = await supabase
    .from('projects')
    .update({ mode, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update project mode' }, { status: 500 })
  }

  // Initialize helix data when switching to helix mode
  if (mode === 'helix') {
    const serviceClient = createServiceClient()

    // Check if steps already exist
    const { data: existingSteps } = await serviceClient
      .from('helix_steps')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)

    if (!existingSteps || existingSteps.length === 0) {
      // Initialize steps
      const { error: stepsError } = await serviceClient
        .from('helix_steps')
        .insert(
          HELIX_STEPS.map((step) => ({
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
  }

  return NextResponse.json({ mode })
}
