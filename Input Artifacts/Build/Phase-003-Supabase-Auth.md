# Phase 003 - Supabase Auth Configuration

## Objective
Implement complete email/password authentication with signup, login, and password reset flows. Create auth pages, configure callback handling, and set up an auth context provider for accessing authentication state throughout the application.

## Prerequisites
- Phase 001 - Next.js Project Setup
- Phase 002 - Supabase Project & Database Schema

## Context
Authentication is the foundation of user management and permission control. This phase implements Supabase Auth which provides email verification, password hashing, and session management. The auth context provider makes user state accessible to all components without prop drilling.

## Detailed Requirements

### 1. Supabase Auth Configuration
Configure in Supabase console:

#### Email Provider Settings
- Go to Authentication > Providers > Email
- Enable both:
  - Email Provider (for login/signup)
  - Confirm email (send verification link)
- Email Templates (customize as needed):
  - Confirmation email template
  - Password reset email template

#### Redirect URLs
- Go to Authentication > URL Configuration
- Add Site URL: `http://localhost:3000` (development)
- Add Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://yourdomain.com/auth/callback` (production)
  - `https://yourdomain.com/login`
  - `https://yourdomain.com/signup`

#### Email Rate Limits
- Set email sending limits to prevent abuse (e.g., 5 emails per hour per email)

### 2. Auth Callback Route

#### File: `app/auth/callback/route.ts`
Handles OAuth and email confirmation callbacks from Supabase.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Code exchanged successfully, user is now authenticated
      // Redirect to org setup or dashboard
      return NextResponse.redirect(`${requestUrl.origin}/org`)
    }
  }

  // If error or no code, redirect to login with error
  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=AuthCallback`
  )
}
```

- Exchanges auth code for session
- Handles redirect after email verification
- Sets authentication cookie for server-side access

### 3. Login Page

#### File: `app/login/page.tsx`
Email/password login form.

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

      // Login successful, redirect to org/project selection
      router.push('/org')
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-slate-50 mb-6 text-center">
            Sign In to Helix Foundry
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-900 text-red-100 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Don't have an account?{' '}
              <Link href="/signup" className="text-blue-400 hover:text-blue-300">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm text-slate-400 hover:text-slate-300">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
```

### 4. Signup Page

#### File: `app/signup/page.tsx`
Registration form for new users.

```typescript
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

    // Validation
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
      // Sign up user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (data.user) {
        // Create profile for new user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              display_name: displayName || email.split('@')[0],
            },
          ])

        if (profileError && !profileError.message.includes('duplicate')) {
          console.error('Profile creation error:', profileError)
        }

        setSuccess(true)
        setEmail('')
        setPassword('')
        setPasswordConfirm('')
        setDisplayName('')

        // Redirect to login after short delay
        setTimeout(() => {
          router.push(
            '/login?message=Check your email to confirm your account'
          )
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-slate-50 mb-2">
              Check Your Email
            </h1>
            <p className="text-slate-400 mb-6">
              We've sent a confirmation link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-slate-500">
              Click the link to verify your account and get started.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-slate-50 mb-6 text-center">
            Create Your Account
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-900 text-red-100 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Display Name (optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="••••••••"
              />
              <p className="text-xs text-slate-500 mt-1">
                Minimum 8 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
```

### 5. Password Reset Page

#### File: `app/forgot-password/page.tsx`
Password reset request form.

```typescript
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-50 mb-4">
              Check Your Email
            </h1>
            <p className="text-slate-400 mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Click the link to reset your password.
            </p>
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Back to login
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-slate-50 mb-6 text-center">
            Reset Password
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-900 text-red-100 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
```

### 6. Reset Password Confirmation Page

#### File: `app/reset-password/page.tsx`
New password entry after reset link clicked.

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-slate-50 mb-6 text-center">
            Reset Password
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-900 text-red-100 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="••••••••"
              />
              <p className="text-xs text-slate-500 mt-1">
                Minimum 8 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
```

### 7. Auth Context Provider

#### File: `lib/auth/context.tsx`
React Context for sharing auth state throughout the application.

```typescript
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const getInitialSession = async () => {
      const {
        data: { session: initialSession },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('Failed to get session:', error)
      } else if (initialSession) {
        setSession(initialSession)
        setUser(initialSession.user)
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### 8. Update Root Layout with Auth Provider

#### File: `app/layout.tsx` (updated)
Wrap app with AuthProvider.

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth/context'
import '@/app/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Helix Foundry',
  description: 'Build, test, and deploy software requirements with industrial precision.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-slate-50`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

## File Structure
Files created/modified in this phase:
```
app/
├── layout.tsx (UPDATED - add AuthProvider)
├── login/
│   └── page.tsx (NEW)
├── signup/
│   └── page.tsx (NEW)
├── forgot-password/
│   └── page.tsx (NEW)
├── reset-password/
│   └── page.tsx (NEW)
└── auth/
    └── callback/
        └── route.ts (NEW)

lib/
├── auth/
│   └── context.tsx (NEW)
└── supabase/
    ├── client.ts
    └── server.ts

types/
└── auth.ts (NEW - can contain auth-specific types)
```

## Acceptance Criteria

1. **Login Page**: `/login` renders without errors, form submits
2. **Signup Page**: `/signup` renders, email verification sent after signup
3. **Logout**: `useAuth()` hook has `signOut()` function that signs out user
4. **Auth Callback**: `/auth/callback?code=xxx` exchanges code for session
5. **Password Reset**: `/forgot-password` sends reset email, `/reset-password` updates password
6. **Auth Context**: `useAuth()` hook available in all client components
7. **Type Safety**: TypeScript imports from Supabase types work
8. **Session Persistence**: Reloading page maintains user session
9. **User Profile**: New signup creates record in `profiles` table
10. **Error Handling**: All forms show appropriate error messages

## Testing Instructions

1. **Test Sign Up Flow**:
   - Navigate to `http://localhost:3000/signup`
   - Fill in form with test email/password
   - Submit form
   - Check email inbox for verification link
   - Click link (should redirect to `/auth/callback`)
   - Should be redirected to `/login` with success message

2. **Test Login**:
   - Navigate to `http://localhost:3000/login`
   - Enter verified email and password
   - Should redirect to `/org` (will fail in Phase 003, that's expected)

3. **Test useAuth Hook**:
   - Create test component in `components/test-auth.tsx`:
     ```typescript
     'use client'
     import { useAuth } from '@/lib/auth/context'

     export function TestAuth() {
       const { user, loading } = useAuth()
       return <div>{loading ? 'Loading...' : user?.email ?? 'Not logged in'}</div>
     }
     ```
   - Add to page and verify user displays after login

4. **Test Password Reset**:
   - Navigate to `/forgot-password`
   - Enter email
   - Check email for reset link
   - Click link (redirects to `/reset-password`)
   - Enter new password and reset
   - Try logging in with new password

5. **Test Session Persistence**:
   - Login to app
   - Refresh page (F5)
   - Should still be logged in (useAuth shows user)

6. **Test Auth Guard**:
   - Logout user
   - Try accessing protected route (will be set up in Phase 004)
   - Should redirect to login

7. **Verify Profile Creation**:
   - Sign up new user with display name
   - In Supabase console, go to profiles table
   - Should see new row with user ID and display name

8. **Test Error Handling**:
   - Try signing up with existing email (should show error)
   - Try logging in with wrong password (should show error)
   - Try resetting password for non-existent email (should handle gracefully)
