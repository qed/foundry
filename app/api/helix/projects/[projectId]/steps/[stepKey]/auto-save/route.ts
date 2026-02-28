import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Json } from '@/types/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; stepKey: string }> }
) {
  try {
    const { projectId, stepKey } = await params
    const supabase = await createClient()
    const data = await request.json()

    // Update helix_steps with evidence_data (without marking complete)
    const { error } = await supabase
      .from('helix_steps')
      .update({
        evidence_data: data as Json,
      })
      .eq('project_id', projectId)
      .eq('step_key', stepKey)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Auto-save error:', error)
    return NextResponse.json({ error: 'Failed to auto-save' }, { status: 500 })
  }
}
