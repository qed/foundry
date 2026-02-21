import { requireAuth } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { CreateOrgForm } from '@/components/org/create-org-form'
import { TopBar } from '@/components/layout/top-bar'
import Link from 'next/link'
import { Plus, UserPlus, ArrowRight } from 'lucide-react'

export default async function OrgSelectorPage() {
  await requireAuth()
  const supabase = await createClient()

  // Use the RPC function to get user's orgs (bypasses RLS recursion)
  const { data: orgs } = await supabase.rpc('get_user_organizations')

  const hasOrgs = orgs && orgs.length > 0

  return (
    <div className="min-h-screen bg-bg-primary">
      <TopBar />
      <main className="max-w-3xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            {hasOrgs ? 'Your Organizations' : (
              <>Welcome to <span className="text-gradient">Helix Foundry</span></>
            )}
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {hasOrgs
              ? 'Select an organization or create a new one'
              : 'Create your first organization to get started'}
          </p>
        </div>

        {/* Existing organizations list */}
        {hasOrgs && (
          <div className="space-y-3 mb-8">
            {orgs.map((org) => (
              <Link
                key={org.id}
                href={`/org/${org.slug}`}
                className="flex items-center justify-between p-5 glass-panel rounded-xl hover:border-accent-cyan/30 transition-colors group"
              >
                <div>
                  <h2 className="font-semibold text-text-primary group-hover:text-accent-cyan transition-colors">
                    {org.name}
                  </h2>
                  <p className="text-xs text-text-tertiary mt-1">
                    {org.role === 'admin' ? 'Admin' : 'Member'} &middot; /{org.slug}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-text-tertiary group-hover:text-accent-cyan transition-colors" />
              </Link>
            ))}
          </div>
        )}

        {/* Create / Join actions */}
        <div className={hasOrgs ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
          {/* Create org */}
          {hasOrgs ? (
            <Link
              href="/onboarding/create-org"
              className="flex items-center gap-4 p-5 glass-panel rounded-xl hover:border-accent-cyan/30 transition-colors group"
            >
              <div className="p-2.5 bg-accent-cyan/10 group-hover:bg-accent-cyan/20 rounded-lg transition-colors">
                <Plus className="w-5 h-5 text-accent-cyan" />
              </div>
              <div>
                <p className="font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                  Create Organization
                </p>
                <p className="text-xs text-text-tertiary">
                  Start a new workspace
                </p>
              </div>
            </Link>
          ) : (
            <div className="glass-panel rounded-xl p-8">
              <CreateOrgForm />
            </div>
          )}

          {/* Join org */}
          <Link
            href="/onboarding/join-org"
            className={`flex items-center gap-4 p-5 glass-panel rounded-xl hover:border-accent-success/30 transition-colors group ${
              !hasOrgs ? 'mt-4' : ''
            }`}
          >
            <div className="p-2.5 bg-accent-success/10 group-hover:bg-accent-success/20 rounded-lg transition-colors">
              <UserPlus className="w-5 h-5 text-accent-success" />
            </div>
            <div>
              <p className="font-medium text-text-primary group-hover:text-accent-success transition-colors">
                Join Organization
              </p>
              <p className="text-xs text-text-tertiary">
                Use an invite code to join an existing workspace
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
