'use client'

import Link from 'next/link'
import { TopBar } from '@/components/layout/top-bar'
import { Plus, UserPlus } from 'lucide-react'

export default function OrgChoicePage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <TopBar />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-text-primary mb-2">
              Welcome to <span className="text-gradient">Helix Foundry</span>
            </h1>
            <p className="text-lg text-text-secondary">
              Let&apos;s get you set up to build incredible projects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Organization */}
            <Link
              href="/onboarding/create-org"
              className="group relative p-8 glass-panel rounded-xl transition-all hover:border-accent-cyan/50"
            >
              <div className="absolute top-4 right-4 p-3 bg-accent-cyan/10 group-hover:bg-accent-cyan/20 rounded-lg transition-colors">
                <Plus className="w-6 h-6 text-accent-cyan" />
              </div>

              <h2 className="text-2xl font-semibold text-text-primary mb-2">
                Create Organization
              </h2>
              <p className="text-text-secondary">
                Start fresh with your own workspace. You&apos;ll be able to invite
                team members later.
              </p>

              <div className="mt-4 text-sm text-accent-cyan font-medium group-hover:text-accent-cyan/80">
                Create Now &rarr;
              </div>
            </Link>

            {/* Join Organization */}
            <Link
              href="/onboarding/join-org"
              className="group relative p-8 glass-panel rounded-xl transition-all hover:border-accent-success/50"
            >
              <div className="absolute top-4 right-4 p-3 bg-accent-success/10 group-hover:bg-accent-success/20 rounded-lg transition-colors">
                <UserPlus className="w-6 h-6 text-accent-success" />
              </div>

              <h2 className="text-2xl font-semibold text-text-primary mb-2">
                Join Organization
              </h2>
              <p className="text-text-secondary">
                Already have an invite code? Join an existing workspace and start
                collaborating.
              </p>

              <div className="mt-4 text-sm text-accent-success font-medium group-hover:text-accent-success/80">
                Join Now &rarr;
              </div>
            </Link>
          </div>

          <div className="mt-8 text-center text-sm text-text-tertiary">
            Need help?{' '}
            <a href="#" className="text-accent-cyan hover:text-accent-cyan/80">
              Contact support
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
