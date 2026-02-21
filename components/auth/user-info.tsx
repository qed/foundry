import { getUserWithProfile } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export async function UserInfo() {
  const result = await getUserWithProfile()

  if (!result) {
    redirect('/login')
  }

  const { user, profile } = result

  return (
    <div className="p-4 bg-bg-secondary rounded-lg border border-border-default">
      <p className="text-sm text-text-secondary">Email</p>
      <p className="text-text-primary font-medium">{user.email}</p>

      <p className="text-sm text-text-secondary mt-4">Display Name</p>
      <p className="text-text-primary">{profile?.display_name || 'Not set'}</p>
    </div>
  )
}
