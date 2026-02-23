import { createServiceClient } from '@/lib/supabase/server'
import { getPlan } from './plans'

/**
 * Get or create an org subscription. Returns the subscription row.
 * Creates a free-plan subscription if none exists.
 */
export async function getOrCreateSubscription(orgId: string) {
  const supabase = createServiceClient()

  const { data: sub } = await supabase
    .from('org_subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .single()

  if (sub) return sub

  // Count current members to seed current_seats
  const { count } = await supabase
    .from('org_members')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)

  const { data: newSub } = await supabase
    .from('org_subscriptions')
    .insert({
      organization_id: orgId,
      plan: 'free',
      seat_limit: 3,
      current_seats: count || 1,
      billing_status: 'active',
    })
    .select()
    .single()

  return newSub
}

/**
 * Check if an org can add a new member. Returns { allowed, reason }.
 */
export async function canAddSeat(orgId: string): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await getOrCreateSubscription(orgId)
  if (!sub) return { allowed: true } // Fail open if no subscription tracking

  if (sub.current_seats >= sub.seat_limit) {
    const plan = getPlan(sub.plan)
    return {
      allowed: false,
      reason: `Seat limit reached (${sub.current_seats}/${sub.seat_limit}). ${
        plan?.id !== 'enterprise' ? 'Upgrade your plan to add more members.' : ''
      }`,
    }
  }

  return { allowed: true }
}

/**
 * Increment current_seats by 1.
 */
export async function incrementSeats(orgId: string) {
  const supabase = createServiceClient()
  const sub = await getOrCreateSubscription(orgId)
  if (!sub) return

  await supabase
    .from('org_subscriptions')
    .update({ current_seats: sub.current_seats + 1 })
    .eq('organization_id', orgId)
}

/**
 * Decrement current_seats by 1 (min 0).
 */
export async function decrementSeats(orgId: string) {
  const supabase = createServiceClient()
  const sub = await getOrCreateSubscription(orgId)
  if (!sub) return

  await supabase
    .from('org_subscriptions')
    .update({ current_seats: Math.max(0, sub.current_seats - 1) })
    .eq('organization_id', orgId)
}
