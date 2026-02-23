import { NextRequest } from 'next/server'
import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { createClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

interface RouteParams {
  params: Promise<{ orgId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params

    // Validates user is authenticated and has org access
    await getOrgAndValidateAccess(orgId)

    const supabase = await createClient()

    const archived = request.nextUrl.searchParams.get('archived')

    let query = supabase
      .from('projects')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (archived === 'true') {
      query = query.eq('is_archived', true)
    } else if (archived === 'false') {
      query = query.eq('is_archived', false)
    }
    // If no filter, return all projects

    const { data: projects, error } = await query

    if (error) {
      throw error
    }

    return Response.json({ projects: projects ?? [] })
  } catch (error) {
    return handleAuthError(error)
  }
}
