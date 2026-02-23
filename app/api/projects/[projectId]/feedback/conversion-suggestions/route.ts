import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateConversionSuggestions } from '@/lib/agent/conversion-suggestions'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireAuth()
  const { projectId } = await params
  const supabase = await createServiceClient()

  // Verify membership
  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Not a project member' }, { status: 403 })
  }

  const result = await generateConversionSuggestions(projectId)

  if (!result) {
    return NextResponse.json(
      { error: 'Failed to generate suggestions. Check that ANTHROPIC_API_KEY is configured.' },
      { status: 500 }
    )
  }

  return NextResponse.json(result)
}
