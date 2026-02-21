'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from '@/components/layout/top-bar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-container'

export default function CreateOrgPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Generate slug from org name
  const slug = orgName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!orgName.trim()) {
      setError('Organization name is required')
      setLoading(false)
      return
    }

    if (slug.length === 0) {
      setError('Organization name must contain valid characters')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization')
      }

      addToast('Organization created successfully!', 'success')
      // Redirect to create first project — pass org id and slug
      router.push(`/onboarding/create-project?orgId=${data.id}&orgSlug=${data.slug}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <TopBar />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-xl p-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Create Organization
            </h1>
            <p className="text-text-secondary mb-6">
              Every project starts with an organization. You can invite team
              members later.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-accent-error/20 text-accent-error rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <Input
                label="Organization Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={loading}
                placeholder="Acme Corporation"
                autoFocus
              />

              {slug && (
                <div className="p-3 bg-bg-tertiary rounded-lg text-sm">
                  <p className="text-text-tertiary">URL slug:</p>
                  <p className="text-text-primary font-mono">{slug}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !orgName.trim()}
                isLoading={loading}
                className="w-full"
              >
                Create Organization
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border-default">
              <p className="text-sm text-text-tertiary text-center">
                Or{' '}
                <Link
                  href="/onboarding/org-choice"
                  className="text-accent-cyan hover:text-accent-cyan/80"
                >
                  go back
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
