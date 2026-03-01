import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { saveStepArtifact } from '@/lib/helix/step-artifacts'
import type { Json } from '@/types/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; stepKey: string }> }
) {
  try {
    const { projectId, stepKey } = await params
    const supabase = await createClient()
    const data = await request.json()

    // Get current user for artifact saving
    const {
      data: { user },
    } = await supabase.auth.getUser()

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

    // Also save as artifact (non-blocking — don't fail the auto-save if this errors)
    if (user) {
      try {
        await saveStepArtifact(projectId, stepKey, data, user.id)
      } catch (err) {
        console.error('[auto-save] Failed to save step artifact:', err)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Auto-save error:', error)
    return NextResponse.json({ error: 'Failed to auto-save' }, { status: 500 })
  }
}
