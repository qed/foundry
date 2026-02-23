import { NextRequest } from 'next/server'
import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { handleAuthError } from '@/lib/auth/errors'
import { ForbiddenError } from '@/lib/auth/errors'
import { getOrCreateSubscription } from '@/lib/billing/seats'
import { getPlan } from '@/lib/billing/plans'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    const { isAdmin } = await getOrgAndValidateAccess(orgId)

    if (!isAdmin) {
      throw new ForbiddenError('Only admins can change the plan')
    }

    const { plan: newPlanId } = await request.json()

    if (!newPlanId || !['free', 'pro', 'enterprise'].includes(newPlanId)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const sub = await getOrCreateSubscription(orgId)
    if (!sub) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if (sub.plan === newPlanId) {
      return Response.json({ error: 'Already on this plan' }, { status: 400 })
    }

    const newPlan = getPlan(newPlanId)
    if (!newPlan) {
      return Response.json({ error: 'Plan not found' }, { status: 400 })
    }

    // Check if downgrade would violate seat count
    if (sub.current_seats > newPlan.seatLimit) {
      return Response.json(
        {
          error: `Cannot switch to ${newPlan.name} plan. You have ${sub.current_seats} members but the ${newPlan.name} plan allows only ${newPlan.seatLimit}. Remove members first.`,
        },
        { status: 409 }
      )
    }

    const supabase = createServiceClient()

    const { data: updated, error } = await supabase
      .from('org_subscriptions')
      .update({
        plan: newPlanId,
        seat_limit: newPlan.seatLimit,
      })
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      return Response.json({ error: 'Failed to update plan' }, { status: 500 })
    }

    return Response.json({
      success: true,
      subscription: updated,
      message: `Switched to ${newPlan.name} plan`,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
