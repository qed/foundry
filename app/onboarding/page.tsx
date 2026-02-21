import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Check if user has any organizations
  const { data: orgs } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)

  if (orgs && orgs.length > 0) {
    // User already has an org, redirect to org selector
    redirect('/org')
  }

  // New user, start onboarding
  redirect('/onboarding/org-choice')
}
