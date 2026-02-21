'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const message = searchParams.get('message')
  const authError = searchParams.get('error')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      router.push('/org')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel rounded-xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Sign In to <span className="text-gradient">Helix Foundry</span>
        </h1>
        <p className="text-text-secondary text-sm">
          Welcome back. Enter your credentials to continue.
        </p>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-accent-success/10 border border-accent-success/30 text-accent-success rounded-lg text-sm">
          {message}
        </div>
      )}

      {authError && (
        <div className="mb-4 p-3 bg-accent-error/10 border border-accent-error/30 text-accent-error rounded-lg text-sm">
          Authentication failed. Please try again.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-accent-error/10 border border-accent-error/30 text-accent-error rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 bg-accent-cyan hover:bg-accent-cyan/80 text-bg-primary rounded-lg font-semibold disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-text-secondary text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-accent-cyan hover:text-accent-cyan/80 transition-colors">
            Sign up
          </Link>
        </p>
      </div>

      <div className="mt-3 text-center">
        <Link href="/forgot-password" className="text-sm text-text-tertiary hover:text-text-secondary transition-colors">
          Forgot password?
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-md">
        <Suspense fallback={
          <div className="glass-panel rounded-xl p-8 text-center">
            <p className="text-text-secondary">Loading...</p>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
