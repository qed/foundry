import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HELIX_STAGES } from '@/config/helix-process'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const supabase = await createClient()

  // Get all steps for this project
  const { data: steps, error } = await supabase
    .from('helix_steps')
    .select('step_key, stage_number, status')
    .eq('project_id', projectId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build progress per stage
  const stages = HELIX_STAGES.map((stage) => {
    const stageSteps = (steps || []).filter((s) => s.stage_number === stage.number)
    const completedSteps = stageSteps.filter((s) => s.status === 'complete').length

    return {
      stageNumber: stage.number,
      stageTitle: stage.title,
      completedSteps,
      totalSteps: stage.steps.length,
    }
  })

  return NextResponse.json({ stages })
}
