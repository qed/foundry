# Phase 004 - Auth Middleware & Sessions

## Objective
Implement Next.js middleware to protect routes, enforce authentication, and manage user sessions. Create server-side auth helpers for use in API routes and server components. Redirect unauthenticated users to login and refresh sessions on every request.

## Prerequisites
- Phase 001 - Next.js Project Setup
- Phase 002 - Supabase Project & Database Schema
- Phase 003 - Supabase Auth Configuration

## Context
Middleware provides a central place to enforce authentication before route handlers execute. This prevents unauthorized access to protected routes. Server-side auth helpers allow API routes and server components to access the authenticated user securely without exposing tokens to the browser.

## Detailed Requirements

### 1. Next.js Middleware Configuration

#### File: `middleware.ts`
Main middleware file for route protection and session refresh.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Define public routes (no auth required)
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

// Define api public routes
const PUBLIC_API_ROUTES = [
  /^\/api\/auth\/.*/,
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public API routes
  if (PUBLIC_API_ROUTES.some((route) => route.test(pathname))) {
    return NextResponse.next()
  }

  // Skip middleware for non-app routes (static files, etc.)
  if (pathname.includes('.')) {
    return NextResponse.next()
  }

  // Get user session
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // If no user and route is not public, redirect to login
    if (!user && !PUBLIC_ROUTES.includes(pathname) && pathname !== '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    // If user is authenticated and tries to access auth pages, redirect to dashboard
    if (user && PUBLIC_ROUTES.includes(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/org'
      return NextResponse.redirect(url)
    }

    // Refresh session
    await supabase.auth.refreshSession()

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, allow request to proceed (could be static file, etc.)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Match all routes except next internals and static files
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
```

**Key Features:**
- Public routes defined as a list (no auth required)
- API routes can have their own public list
- Session refresh on every request
- Redirects to login with returnTo parameter for post-login redirect
- Authenticated users redirected away from auth pages
- Error handling for middleware exceptions

### 2. Server-Side Auth Helpers

#### File: `lib/auth/server.ts`
Server-side authentication utilities for use in API routes and server components.

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { cache } from 'react'

// Cache the user during a single request to avoid multiple DB calls
export const getUser = cache(async () => {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw new Error(`Failed to get user: ${error.message}`)
  }

  return user
})

// Cache the session during a single request
export const getSession = cache(async () => {
  const supabase = await createServerSupabaseClient()

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw new Error(`Failed to get session: ${error.message}`)
  }

  return session
})

// Get authenticated user with profile information
export const getUserWithProfile = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const user = await getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get profile: ${error.message}`)
  }

  return {
    user,
    profile: profile ?? null,
  }
})

// Require authentication, throw if user is not authenticated
export const requireAuth = cache(async () => {
  const user = await getUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
})

// Require authentication, throw if user is not authenticated, return with profile
export const requireAuthWithProfile = cache(async () => {
  const result = await getUserWithProfile()

  if (!result) {
    throw new Error('Authentication required')
  }

  return result
})
```

**Key Features:**
- `cache()` wrapper prevents duplicate database calls within single request
- `getUser()` - Get authenticated user or null
- `getSession()` - Get session or null
- `getUserWithProfile()` - Get user with profile data
- `requireAuth()` - Throw error if not authenticated
- `requireAuthWithProfile()` - Throw error if not authenticated, return with profile

### 3. Error Handling for Protected Routes

#### File: `lib/auth/errors.ts`
Custom error classes for auth-related errors.

```typescript
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AuthError {
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

// Handle errors in API routes
export function handleAuthError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return Response.json(
      { error: error.message },
      { status: 401 }
    )
  }

  if (error instanceof ForbiddenError) {
    return Response.json(
      { error: error.message },
      { status: 403 }
    )
  }

  if (error instanceof NotFoundError) {
    return Response.json(
      { error: error.message },
      { status: 404 }
    )
  }

  if (error instanceof AuthError) {
    return Response.json(
      { error: error.message },
      { status: 400 }
    )
  }

  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

### 4. Protected API Route Example

#### File: `app/api/user/profile/route.ts`
Example API route that requires authentication.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { handleAuthError } from '@/lib/auth/errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await requireAuthWithProfile()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireAuthWithProfile()
    const body = await request.json()

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('profiles')
      .update({
        display_name: body.display_name,
        avatar_url: body.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data)
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### 5. Protected Server Component Example

#### File: `components/auth/user-info.tsx`
Example server component that requires authentication.

```typescript
import { getUserWithProfile } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export async function UserInfo() {
  try {
    const result = await getUserWithProfile()

    if (!result) {
      redirect('/login')
    }

    const { user, profile } = result

    return (
      <div className="p-4 bg-slate-800 rounded">
        <p className="text-sm text-slate-400">Email</p>
        <p className="text-slate-50 font-medium">{user.email}</p>

        <p className="text-sm text-slate-400 mt-4">Display Name</p>
        <p className="text-slate-50">{profile?.display_name || 'Not set'}</p>
      </div>
    )
  } catch (error) {
    redirect('/login')
  }
}
```

### 6. Client-Side Route Protection Hook

#### File: `hooks/useRequireAuth.ts`
Hook to protect client components that require authentication.

```typescript
'use client'

import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  return { user, loading }
}
```

### 7. Auth Status Check Endpoint

#### File: `app/api/auth/status/route.ts`
Endpoint to check current authentication status.

```typescript
import { getUser } from '@/lib/auth/server'

export async function GET() {
  try {
    const user = await getUser()

    return Response.json({
      authenticated: !!user,
      user: user
        ? {
            id: user.id,
            email: user.email,
          }
        : null,
    })
  } catch (error) {
    return Response.json(
      { authenticated: false, error: 'Failed to check auth status' },
      { status: 500 }
    )
  }
}
```

### 8. Logout API Endpoint

#### File: `app/api/auth/logout/route.ts`
Server-side logout endpoint.

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}
```

### 9. Update Auth Context with Server Logout

#### File: `lib/auth/context.tsx` (updated)
Update signOut to use server endpoint for better cleanup.

```typescript
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()

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
    try {
      // Call server endpoint for cleanup
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }

    // Also sign out on client
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    router.push('/login')
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

### 10. Environment Variables Update

Update `.env.local` to include middleware configuration (if needed):
```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Auth Configuration
NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000
```

## File Structure
Files created/modified in this phase:
```
middleware.ts (NEW)

lib/
├── auth/
│   ├── context.tsx (UPDATED)
│   ├── server.ts (NEW)
│   └── errors.ts (NEW)
└── supabase/
    ├── client.ts
    └── server.ts

hooks/
└── useRequireAuth.ts (NEW)

app/
├── api/
│   ├── auth/
│   │   ├── status/
│   │   │   └── route.ts (NEW)
│   │   └── logout/
│   │       └── route.ts (NEW)
│   └── user/
│       └── profile/
│           └── route.ts (NEW - example)
└── components/
    └── auth/
        └── user-info.tsx (NEW - example)
```

## Acceptance Criteria

1. **Middleware Runs**: Middleware executes on every request without errors
2. **Public Routes Accessible**: `/login`, `/signup` accessible without authentication
3. **Protected Routes Blocked**: Accessing `/org` without auth redirects to `/login`
4. **Session Refresh**: Session refreshes automatically on request
5. **Redirect Parameter**: After login, user redirected to original requested route
6. **Authenticated Users Redirected**: Logged-in users accessing `/login` redirect to `/org`
7. **getUser() Works**: Server-side `getUser()` returns authenticated user
8. **requireAuth() Works**: `requireAuth()` throws error if not authenticated
9. **Auth Context Updated**: `useAuth()` has working `signOut()` function
10. **API Endpoints Protected**: `/api/user/profile` returns 401 if not authenticated

## Testing Instructions

1. **Test Middleware Redirect**:
   - Clear browser cookies/localStorage
   - Try navigating to `http://localhost:3000/org`
   - Should redirect to `/login`
   - Check URL includes `redirectTo=/org` parameter

2. **Test Public Routes**:
   - While not authenticated, navigate to `/login` and `/signup`
   - Should load without redirects

3. **Test Authenticated Route Redirect**:
   - Login successfully
   - Navigate to `/login`
   - Should redirect to `/org` (or your default authenticated route)

4. **Test Session Refresh**:
   - Login to app
   - Open DevTools > Application > Cookies
   - Note expiration time
   - Make a request (reload page)
   - Check if session cookie updated

5. **Test getUser() Hook**:
   - Create test API route:
     ```typescript
     import { getUser } from '@/lib/auth/server'

     export async function GET() {
       const user = await getUser()
       return Response.json({ user })
     }
     ```
   - Access route while authenticated
   - Should return user object
   - Access while not authenticated
   - Should return null

6. **Test requireAuth() Hook**:
   - Create test API route:
     ```typescript
     import { requireAuth } from '@/lib/auth/server'

     export async function GET() {
       const user = await requireAuth()
       return Response.json({ user })
     }
     ```
   - Access while not authenticated
   - Should return 500 error (can be caught and handled)

7. **Test API Endpoint Protection**:
   - Logout user
   - Try accessing `/api/user/profile`
   - Should return 401 or redirect to login

8. **Test Logout**:
   - Login to app
   - Call `useAuth()` hook in component
   - Click logout button
   - Session should clear
   - Should redirect to `/login`

9. **Test useRequireAuth Hook**:
   - Create client component:
     ```typescript
     'use client'
     import { useRequireAuth } from '@/hooks/useRequireAuth'

     export function ProtectedComponent() {
       const { user, loading } = useRequireAuth()

       if (loading) return <div>Loading...</div>
       return <div>Welcome, {user?.email}</div>
     }
     ```
   - Add to page
   - While logged out, should redirect to login
   - While logged in, should display email

10. **Test Auth Status Endpoint**:
    - While authenticated:
      ```bash
      curl http://localhost:3000/api/auth/status
      ```
      Should return `{ "authenticated": true, "user": { ... } }`
    - While not authenticated:
      Should return `{ "authenticated": false, "user": null }`
