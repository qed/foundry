import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { handleAuthError } from '@/lib/auth/errors'
import { getOrCreateSubscription } from '@/lib/billing/seats'
import { getPlan } from '@/lib/billing/plans'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    await getOrgAndValidateAccess(orgId)

    const sub = await getOrCreateSubscription(orgId)
    if (!sub) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const plan = getPlan(sub.plan)

    // Count actual members for accuracy
    const supabase = createServiceClient()
    const { count: memberCount } = await supabase
      .from('org_members')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)

    const { count: projectCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('is_archived', false)

    const { count: archivedCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('is_archived', true)

    return Response.json({
      subscription: sub,
      plan: plan || null,
      usage: {
        seats: {
          used: memberCount || sub.current_seats,
          limit: sub.seat_limit,
          percentage: Math.round(((memberCount || sub.current_seats) / sub.seat_limit) * 100),
        },
        projects: {
          active: projectCount || 0,
          archived: archivedCount || 0,
        },
      },
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
