'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateOrgForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create organization')
        return
      }

      router.push(`/org/${data.slug}`)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-accent-error/10 border border-accent-error/30 text-accent-error rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Organization Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
          className="w-full px-4 py-2.5 bg-bg-primary border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan disabled:opacity-50 transition-colors"
          placeholder="e.g. Acme Corp"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full px-4 py-2.5 bg-accent-cyan hover:bg-accent-cyan/80 text-bg-primary rounded-lg font-semibold disabled:opacity-50 transition-colors cursor-pointer"
      >
        {loading ? 'Creating...' : 'Create Organization'}
      </button>
    </form>
  )
}
