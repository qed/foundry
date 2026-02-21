import { notFound } from 'next/navigation'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { OrgProvider } from '@/lib/context/org-context'

interface OrgLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgSlug } = await params
  const { user } = await requireAuthWithProfile()

  const supabase = await createClient()

  // Get organization by slug
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', orgSlug)
    .single()

  if (orgError || !org) {
    notFound()
  }

  // Verify user is member of organization
  const { data: membership, error: memberError } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    notFound()
  }

  return (
    <OrgProvider org={org} userRole={membership.role as 'admin' | 'member'}>
      {children}
    </OrgProvider>
  )
}
