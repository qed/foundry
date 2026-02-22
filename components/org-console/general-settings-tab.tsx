'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast-container'
import type { Organization } from '@/types/database'

interface GeneralSettingsTabProps {
  org: Organization
}

export function GeneralSettingsTab({ org }: GeneralSettingsTabProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [name, setName] = useState(org.name)
  const [description, setDescription] = useState(org.description || '')
  const [isSaving, setIsSaving] = useState(false)

  const hasChanges = name !== org.name || description !== (org.description || '')

  async function handleSave() {
    if (!name.trim()) return
    setIsSaving(true)

    try {
      const res = await fetch(`/api/orgs/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }

      addToast('Organization updated', 'success')
      router.refresh()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">General</h2>

        <div className="space-y-4">
          <Input
            label="Organization name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Slug
            </label>
            <div className="px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-sm text-text-tertiary">
              {org.slug}
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              Cannot be changed after creation
            </p>
          </div>

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this organization about?"
            rows={3}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!hasChanges || !name.trim()}
            >
              Save changes
            </Button>
            {hasChanges && (
              <span className="text-xs text-text-tertiary">Unsaved changes</span>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">Info</h2>
        <div className="text-sm text-text-secondary space-y-1">
          <p>Created: {new Date(org.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  )
}
