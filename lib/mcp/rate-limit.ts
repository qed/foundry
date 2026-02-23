/**
 * Simple in-memory sliding window rate limiter.
 * For production, use Redis or similar distributed store.
 */

interface WindowEntry {
  timestamps: number[]
}

const windows = new Map<string, WindowEntry>()

// Clean up old entries every 5 minutes
const WINDOW_MS = 60_000 // 1 minute window

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of windows.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS)
    if (entry.timestamps.length === 0) {
      windows.delete(key)
    }
  }
}, 5 * 60_000)

export function checkRateLimit(connectionId: string, limit: number): {
  allowed: boolean
  remaining: number
  limit: number
  resetTime: number
} {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  let entry = windows.get(connectionId)
  if (!entry) {
    entry = { timestamps: [] }
    windows.set(connectionId, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  const remaining = Math.max(0, limit - entry.timestamps.length)
  const resetTime = Math.ceil((windowStart + WINDOW_MS) / 1000) // Unix seconds

  if (entry.timestamps.length >= limit) {
    return { allowed: false, remaining: 0, limit, resetTime }
  }

  entry.timestamps.push(now)
  return { allowed: true, remaining: remaining - 1, limit, resetTime }
}

export function rateLimitHeaders(result: ReturnType<typeof checkRateLimit>): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetTime),
  }
}
