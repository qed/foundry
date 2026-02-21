'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (data.user) {
        setSuccess(true)

        setTimeout(() => {
          router.push('/login?message=Check your email to confirm your account')
        }, 3000)
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-success/10 border border-accent-success/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Check Your Email
            </h1>
            <p className="text-text-secondary mb-6">
              We&apos;ve sent a confirmation link to your email address.
            </p>
            <p className="text-sm text-text-tertiary">
              Click the link to verify your account and get started.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Create Your <span className="text-gradient">Account</span>
            </h1>
            <p className="text-text-secondary text-sm">
              Join Helix Foundry and start building.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-accent-error/10 border border-accent-error/30 text-accent-error rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Display Name <span className="text-text-tertiary">(optional)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-bg-primary border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan disabled:opacity-50 transition-colors"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2.5 bg-bg-primary border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan disabled:opacity-50 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Password
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
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-secondary text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-accent-cyan hover:text-accent-cyan/80 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
