'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from '@/components/layout/top-bar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-container'

export default function JoinOrgPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleJoinOrg(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!inviteCode.trim()) {
      setError('Invite code is required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/orgs/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join organization')
      }

      addToast('Successfully joined organization!', 'success')
      router.push(`/org/${data.org.slug}`)
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
              Join Organization
            </h1>
            <p className="text-text-secondary mb-6">
              Enter the invite code provided by your organization admin.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-accent-error/20 text-accent-error rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleJoinOrg} className="space-y-4">
              <Input
                label="Invite Code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                disabled={loading}
                placeholder="ABC123XYZ789"
                autoFocus
              />

              <Button
                type="submit"
                disabled={loading || !inviteCode.trim()}
                isLoading={loading}
                className="w-full"
              >
                Join Organization
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border-default">
              <p className="text-sm text-text-tertiary text-center">
                Don&apos;t have an invite?{' '}
                <Link
                  href="/onboarding/create-org"
                  className="text-accent-cyan hover:text-accent-cyan/80"
                >
                  Create one instead
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
