import { redirect } from 'next/navigation'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { UserSettingsClient } from '@/components/settings/user-settings-client'

export default async function SettingsProfilePage() {
  const { user, profile } = await requireAuthWithProfile()

  if (!user || !profile) {
    redirect('/login')
  }

  return (
    <UserSettingsClient
      user={{ id: user.id, email: user.email || '', created_at: user.created_at }}
      initialProfile={profile}
    />
  )
}
