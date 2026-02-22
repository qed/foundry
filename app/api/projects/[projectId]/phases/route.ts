import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
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
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    const { data: phases, error } = await supabase
      .from('phases')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching phases:', error)
      return Response.json(
        { error: 'Failed to fetch phases' },
        { status: 500 }
      )
    }

    return Response.json({ phases: phases || [] })
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      return Response.json(
        { error: 'Name is required (1-100 characters)' },
        { status: 400 }
      )
    }

    if (description !== undefined && description !== null && typeof description === 'string' && description.length > 255) {
      return Response.json(
        { error: 'Description must be 255 characters or less' },
        { status: 400 }
      )
    }

    // Calculate next position
    const { data: maxPhase } = await supabase
      .from('phases')
      .select('position')
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPhase?.position ?? -1) + 1

    const { data: phase, error } = await supabase
      .from('phases')
      .insert({
        project_id: projectId,
        name: name.trim(),
        description: description?.trim() || null,
        position: nextPosition,
        status: 'planned' as const,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating phase:', error)
      return Response.json(
        { error: 'Failed to create phase' },
        { status: 500 }
      )
    }

    return Response.json({ phase }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
