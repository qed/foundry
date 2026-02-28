# Phase 157 — Performance Optimization and Security Hardening

## Objective
Code splitting for Helix routes, query optimization (indexes, N+1 fixes), memoization, RLS policy audit, rate limiting on API routes, input sanitization, and CSRF protection.

## Prerequisites
- All previous phases — Complete Helix implementation

## Epic Context
**Epic:** 19 — Process Customization & Advanced
**Phase:** 157 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
This is the final hardening phase. Performance and security are cross-cutting concerns that affect all systems. Optimize bundling, database queries, and caching. Audit and strengthen security: RLS policies, rate limiting, input validation, CSRF tokens.

---

## Detailed Requirements

### 1. Performance Optimizations

#### Code Splitting
- Dynamic imports for Helix routes
- Lazy load modal components
- Chunk graphs and charts separately
- Preload critical paths

#### Database Query Optimization
- Add missing indexes (project_id, org_id, created_at on all helix_* tables)
- Fix N+1 queries (select with join instead of loop)
- Add query result caching (1-15 minute TTL)
- Monitor slow queries (>100ms)

#### Caching Strategy
- Client-side: React Query with 5-15min stale time
- Server-side: Redis for frequently accessed data
- CDN caching for static assets (Recharts library, icons)
- Browser caching headers (Cache-Control, ETag)

#### File: `lib/performance/caching.ts` (NEW)
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Try cache first
  const cached = await redis.get<T>(key);
  if (cached) return cached;

  // Fetch data
  const data = await fetcher();

  // Cache it
  await redis.set(key, data, { ex: ttlSeconds });

  return data;
}

export async function invalidateCache(pattern: string): Promise<void> {
  // Invalidate cache by pattern
  const keys = await redis.keys(`${pattern}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// Memoization for expensive computations
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();

  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);

    // Clear cache after 5 minutes
    setTimeout(() => cache.delete(key), 5 * 60 * 1000);

    return result;
  }) as T;
}
```

### 2. Security Hardening

#### RLS Policy Audit
All helix_* tables must have RLS enabled and policies verified:
- Users can only see org data they have access to
- Non-admins cannot modify process definitions
- No direct table access without policies
- Verify policies with manual testing

#### Rate Limiting
```typescript
// app/api/middleware.ts
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
  analytics: true,
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, pending, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new NextResponse('Rate limited', { status: 429 });
  }

  return NextResponse.next({
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    },
  });
}
```

#### Input Sanitization
```typescript
// lib/security/sanitization.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input);
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'] });
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

#### CSRF Protection
```typescript
// lib/security/csrf.ts
import { generateToken, verifyToken } from 'csrf';

const tokens = new Map<string, string>();

export function generateCsrfToken(sessionId: string): string {
  const token = generateToken();
  tokens.set(sessionId, token);
  return token;
}

export function verifyCsrfToken(sessionId: string, token: string): boolean {
  const storedToken = tokens.get(sessionId);
  return storedToken === token;
}

// Middleware to verify CSRF on POST/PUT/DELETE
export function csrfProtectionMiddleware(request: NextRequest) {
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    const token = request.headers.get('x-csrf-token');
    const sessionId = request.cookies.get('session')?.value;

    if (!token || !sessionId || !verifyCsrfToken(sessionId, token)) {
      return new NextResponse('CSRF validation failed', { status: 403 });
    }
  }

  return NextResponse.next();
}
```

#### Security Headers
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 3. Index Optimization

```sql
-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_helix_phases_project_created
  ON helix_build_phases(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_helix_stages_project_created
  ON helix_process_stage_history(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_helix_artifacts_project_created
  ON helix_artifacts(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_helix_external_builds_project
  ON helix_external_builds(project_id, status);

CREATE INDEX IF NOT EXISTS idx_helix_cicd_events_project
  ON helix_cicd_events(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_helix_github_events_project
  ON helix_github_events(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_helix_audit_log_project
  ON helix_agent_audit_log(target_project, created_at DESC);

-- Analyze tables for query planner
ANALYZE helix_build_phases;
ANALYZE helix_process_stage_history;
ANALYZE helix_artifacts;
ANALYZE helix_external_builds;
ANALYZE helix_cicd_events;
ANALYZE helix_github_events;
ANALYZE helix_agent_audit_log;
```

### 4. Performance Monitoring

```typescript
// lib/monitoring/performanceMonitoring.ts
export function recordMetric(
  name: string,
  value: number,
  unit: string = 'ms'
): void {
  if (typeof window !== 'undefined') {
    // Client-side metrics
    if (window.performance?.measure) {
      window.performance.measure(name, undefined, undefined);
    }
  } else {
    // Server-side metrics
    console.log(`[METRIC] ${name}: ${value}${unit}`);
  }
}

export function measureQuery(query: string, duration: number): void {
  if (duration > 100) {
    console.warn(`[SLOW_QUERY] ${query} took ${duration}ms`);
  }
}
```

---

## File Structure
```
lib/
├── performance/
│   └── caching.ts (NEW)
├── security/
│   ├── sanitization.ts (NEW)
│   ├── csrf.ts (NEW)
│   └── authentication.ts (UPDATED)
└── monitoring/
    └── performanceMonitoring.ts (NEW)
migrations/
└── add_helix_performance_indexes.sql (NEW)
next.config.js (UPDATED with security headers)
```

---

## Acceptance Criteria
1. Helix routes code-split (separate bundles)
2. All helix_* tables have RLS policies
3. N+1 queries fixed (verified with profiling)
4. Query caching implemented (Redis)
5. All API endpoints rate-limited
6. Input sanitization on all user inputs
7. CSRF tokens required for state-changing requests
8. Security headers set (CSP, X-Frame-Options, etc)
9. Missing indexes created
10. Slow queries identified and optimized

---

## Testing Instructions
1. Run Lighthouse, verify performance score >80
2. Check bundle sizes, verify code splitting effective
3. Test RLS: user can't see other org data
4. Simulate N+1: fix and verify improvement
5. Test rate limiting: exceed limit, verify 429
6. Test CSRF: POST without token, verify 403
7. Test sanitization: submit XSS payload, verify cleaned
8. Test security headers: check with online tools
9. Run slow query log, verify <1% queries >100ms
10. Load test: 100 concurrent users, verify stability

---

## Deployment Checklist
- [ ] All RLS policies enabled and tested
- [ ] Rate limiting configured and deployed
- [ ] Security headers configured in next.config.js
- [ ] CSRF token middleware enabled
- [ ] Input sanitization verified in all handlers
- [ ] Indexes created in production
- [ ] Cache strategy configured (Redis)
- [ ] Monitoring and alerting enabled
- [ ] Slow query alerts configured
- [ ] Security audit passed

---

## Notes for the AI Agent
- CRITICAL: RLS policies are security boundary, test thoroughly
- Rate limiting should be per-user, not per-IP for APIs
- CSRF tokens required on all POST/PUT/DELETE
- Never trust user input, always sanitize
- Monitor for slow queries in production
- Performance is feature parity with v1 requirement
- Security is non-negotiable, no shortcuts
