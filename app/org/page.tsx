import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { CreateOrgForm } from '@/components/org/create-org-form'

export default async function OrgSelectorPage() {
  await requireAuth()
  const supabase = await createClient()

  // Use the RPC function to get user's orgs (bypasses RLS recursion)
  const { data: orgs, error } = await supabase.rpc('get_user_organizations')

  if (!error && orgs && orgs.length > 0) {
    redirect(`/org/${orgs[0].slug}`)
  }

  // No organizations — show create form
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Welcome to <span className="text-gradient">Helix Foundry</span>
            </h1>
            <p className="text-text-secondary text-sm">
              Create your first organization to get started.
            </p>
          </div>

          <CreateOrgForm />
        </div>
      </div>
    </main>
  )
}
