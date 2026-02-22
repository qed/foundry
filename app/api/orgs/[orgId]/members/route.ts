import { NextRequest } from 'next/server'
import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

interface RouteParams {
  params: Promise<{ orgId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params
    await getOrgAndValidateAccess(orgId)

    const supabase = await createServiceClient()

    const { data: members, error } = await supabase
      .from('org_members')
      .select('id, user_id, role, joined_at, created_at')
      .eq('org_id', orgId)
      .order('joined_at', { ascending: true })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Enrich with profile data
    const userIds = (members || []).map((m) => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds)

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    )

    const enriched = (members || []).map((m) => ({
      ...m,
      profile: profileMap.get(m.user_id) || null,
    }))

    return Response.json({ members: enriched })
  } catch (error) {
    return handleAuthError(error)
  }
}
