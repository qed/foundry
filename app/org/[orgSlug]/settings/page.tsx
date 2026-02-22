import { redirect } from 'next/navigation'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { OrgConsoleClient } from '@/components/org-console/org-console-client'

interface SettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { orgSlug } = await params
  const { user } = await requireAuthWithProfile()
  const supabase = await createClient()

  // Get org
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    redirect(`/org/${orgSlug}`)
  }

  // Get user's membership and role
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'admin') {
    redirect(`/org/${orgSlug}`)
  }

  // Get members with profiles
  const { data: members } = await supabase
    .from('org_members')
    .select('id, user_id, role, joined_at')
    .eq('org_id', org.id)
    .order('joined_at', { ascending: true })

  const userIds = (members || []).map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  )

  const enrichedMembers = (members || []).map((m) => ({
    ...m,
    profile: profileMap.get(m.user_id) || null,
  }))

  // Get projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  return (
    <OrgConsoleClient
      org={org}
      orgSlug={orgSlug}
      currentUserId={user.id}
      initialMembers={enrichedMembers}
      initialProjects={projects || []}
    />
  )
}
