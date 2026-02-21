import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes accessible without authentication
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

// Auth page routes (authenticated users get redirected away)
const AUTH_PAGES = ['/login', '/signup', '/forgot-password']

// API routes that don't require auth
const PUBLIC_API_PATTERNS = [/^\/api\/auth\/.*/]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip for static files
  if (pathname.includes('.')) {
    return NextResponse.next()
  }

  // Allow public API routes through
  if (PUBLIC_API_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next()
  }

  // Create Supabase client with request/response cookie handling
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — this is critical for keeping the session alive
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Unauthenticated user trying to access protected route
  if (!user && !PUBLIC_ROUTES.includes(pathname) && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated user trying to access auth pages — send them to /org
  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/org'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
