'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password !== passwordConfirm) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.push('/login?message=Password reset successfully')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Set New Password
            </h1>
            <p className="text-text-secondary text-sm">
              Enter your new password below.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-accent-error/10 border border-accent-error/30 text-accent-error rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2.5 bg-bg-primary border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan disabled:opacity-50 transition-colors"
                placeholder="••••••••"
              />
              <p className="text-xs text-text-tertiary mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2.5 bg-bg-primary border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan disabled:opacity-50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-accent-cyan hover:bg-accent-cyan/80 text-bg-primary rounded-lg font-semibold disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
