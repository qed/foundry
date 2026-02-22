'use client'

import { useState } from 'react'
import { Settings, Users, FolderKanban, AlertTriangle } from 'lucide-react'
import { TopBar } from '@/components/layout/top-bar'
import { GeneralSettingsTab } from './general-settings-tab'
import { MembersTab } from './members-tab'
import { ProjectsTab } from './projects-tab'
import { DangerZoneTab } from './danger-zone-tab'
import { cn } from '@/lib/utils'
import type { Organization, Project } from '@/types/database'

interface MemberWithProfile {
  id: string
  user_id: string
  role: string
  joined_at: string
  profile: { id: string; display_name: string; avatar_url: string | null } | null
}

interface OrgConsoleClientProps {
  org: Organization
  orgSlug: string
  currentUserId: string
  initialMembers: MemberWithProfile[]
  initialProjects: Project[]
}

const tabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
] as const

type TabId = (typeof tabs)[number]['id']

export function OrgConsoleClient({
  org,
  orgSlug,
  currentUserId,
  initialMembers,
  initialProjects,
}: OrgConsoleClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general')

  return (
    <div className="min-h-screen bg-bg-primary">
      <TopBar />
      <main className="max-w-4xl mx-auto p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-text-tertiary mb-1">
            <a href={`/org/${orgSlug}`} className="hover:text-text-secondary transition-colors">
              {org.name}
            </a>
            {' / '}
            Settings
          </p>
          <h1 className="text-2xl font-bold text-text-primary">Organization Settings</h1>
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
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default',
                  tab.id === 'danger' && 'text-accent-error hover:text-accent-error'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'general' && (
          <GeneralSettingsTab org={org} />
        )}
        {activeTab === 'members' && (
          <MembersTab
            orgId={org.id}
            currentUserId={currentUserId}
            initialMembers={initialMembers}
          />
        )}
        {activeTab === 'projects' && (
          <ProjectsTab
            orgSlug={orgSlug}
            initialProjects={initialProjects}
          />
        )}
        {activeTab === 'danger' && (
          <DangerZoneTab org={org} orgSlug={orgSlug} />
        )}
      </main>
    </div>
  )
}
