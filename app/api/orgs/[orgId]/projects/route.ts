import { NextRequest } from 'next/server'
import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { createClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

interface RouteParams {
  params: Promise<{ orgId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params

    // Validates user is authenticated and has org access
    await getOrgAndValidateAccess(orgId)

    const supabase = await createClient()

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return Response.json({ projects: projects ?? [] })
  } catch (error) {
    return handleAuthError(error)
  }
}
