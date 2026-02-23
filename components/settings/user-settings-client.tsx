'use client'

import { useState } from 'react'
import { User, Shield, SlidersHorizontal } from 'lucide-react'
import { TopBar } from '@/components/layout/top-bar'
import { ProfileTab } from './profile-tab'
import { SecurityTab } from './security-tab'
import { PreferencesTab } from './preferences-tab'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface UserSettingsClientProps {
  user: { id: string; email: string; created_at: string }
  initialProfile: Profile
}

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
] as const

type TabId = (typeof tabs)[number]['id']

export function UserSettingsClient({ user, initialProfile }: UserSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  return (
    <div className="min-h-screen bg-bg-primary">
      <TopBar />
      <main className="max-w-3xl mx-auto p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Account Settings</h1>
          <p className="text-sm text-text-tertiary mt-1">
            Manage your profile, security, and preferences
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-border-default mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-accent-cyan text-accent-cyan'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'profile' && (
          <ProfileTab user={user} initialProfile={initialProfile} />
        )}
        {activeTab === 'security' && (
          <SecurityTab />
        )}
        {activeTab === 'preferences' && (
          <PreferencesTab initialProfile={initialProfile} />
        )}
      </main>
    </div>
  )
}
