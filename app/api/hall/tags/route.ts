import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return Response.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Verify user belongs to project
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

    // Fetch all tags for this project
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching tags:', error)
      return Response.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      )
    }

    return Response.json(tags || [])
  } catch (error) {
    return handleAuthError(error)
  }
}
