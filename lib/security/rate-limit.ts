/**
 * In-memory sliding-window rate limiter.
 * For production, replace with Redis-backed rate limiting (e.g. @upstash/ratelimit).
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - 120_000
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
      if (entry.timestamps.length === 0) store.delete(key)
    }
  }, 300_000)
}

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window size in milliseconds (default: 60_000 = 1 minute) */
  windowMs?: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs = 60_000 } = options
  const now = Date.now()
  const windowStart = now - windowMs

  let entry = store.get(identifier)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(identifier, entry)
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  const remaining = Math.max(0, limit - entry.timestamps.length)
  const resetAt = entry.timestamps.length > 0
    ? entry.timestamps[0] + windowMs
    : now + windowMs

  if (entry.timestamps.length >= limit) {
    return { success: false, limit, remaining: 0, resetAt }
  }

  entry.timestamps.push(now)
  return { success: true, limit, remaining: remaining - 1, resetAt }
}

/** Extract client IP from request headers */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/** Apply rate limiting to an API route. Returns a 429 Response if rate exceeded, null otherwise. */
export function withRateLimit(
  request: Request,
  options: RateLimitOptions = { limit: 100 }
): Response | null {
  const ip = getClientIP(request)
  const result = checkRateLimit(ip, options)

  if (!result.success) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
        'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
      },
    })
  }

  return null
}
