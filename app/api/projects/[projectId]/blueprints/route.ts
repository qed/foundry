import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { BlueprintType } from '@/types/database'

const VALID_TYPES: BlueprintType[] = ['foundation', 'system_diagram', 'feature']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type')
    const search = searchParams.get('search')
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

    let query = supabase
      .from('blueprints')
      .select('*')
      .eq('project_id', projectId)

    if (typeFilter && VALID_TYPES.includes(typeFilter as BlueprintType)) {
      query = query.eq('blueprint_type', typeFilter as BlueprintType)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data: blueprints, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching blueprints:', error)
      return Response.json(
        { error: 'Failed to fetch blueprints' },
        { status: 500 }
      )
    }

    return Response.json({ blueprints: blueprints || [] })
  } catch (err) {
    return handleAuthError(err)
  }
}
