'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-container'
import type { Profile } from '@/types/database'

interface ProfileTabProps {
  user: { id: string; email: string; created_at: string }
  initialProfile: Profile
}

export function ProfileTab({ user, initialProfile }: ProfileTabProps) {
  const { addToast } = useToast()
  const [displayName, setDisplayName] = useState(initialProfile.display_name)
  const [bio, setBio] = useState(initialProfile.bio || '')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!displayName.trim()) {
      addToast('Display name is required', 'error')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      addToast('Profile updated', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Display Name */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Profile Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={255}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Bio
              <span className="text-text-tertiary font-normal ml-1">({bio.length}/500)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="A short description about yourself..."
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} isLoading={isSaving} size="sm">
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Read-only info */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Account Information</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Email</span>
            <span className="text-sm text-text-primary">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">User ID</span>
            <span className="text-xs text-text-tertiary font-mono">{user.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Member since</span>
            <span className="text-sm text-text-primary">
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
