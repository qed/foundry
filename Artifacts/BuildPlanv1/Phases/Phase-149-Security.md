# Phase 149: Security Audit & Hardening

## Objective
Conduct comprehensive security audit, review RLS policies, implement API rate limiting, sanitize inputs, and harden application against common attacks.

## Prerequisites
- All prior phases (001-148)
- Security testing tools
- Penetration testing knowledge

## Context
Security breaches damage reputation and user trust. Proactive security measures prevent exploits and protect sensitive data.

## Detailed Requirements

### RLS Policy Audit

**Review All Policies:**
```sql
-- Check all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Verify Coverage:**
- [ ] All tables have appropriate policies
- [ ] No policies allow public access (unless intended)
- [ ] User isolation enforced (org_id, project_id checks)
- [ ] Update/delete policies restrict to data owner
- [ ] No policy gaps that could leak data

**Example RLS Policy Audit:**
```sql
-- Ideas table: users can only see ideas in their orgs
CREATE POLICY "users can select ideas in their orgs"
  ON ideas FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Verify: no one can select all ideas
SELECT COUNT(*) FROM ideas; -- Should require org context
```

### API Rate Limiting

**Implement Rate Limiting:**
```ts
// lib/middleware/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
});

export async function withRateLimit(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      },
    });
  }

  return {
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    },
  };
}
```

**Apply Rate Limiting to API Routes:**
```ts
// app/api/projects/[projectId]/ideas/route.ts
import { withRateLimit } from '@/lib/middleware/rateLimit';

export async function GET(request: Request) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse instanceof Response) {
    return rateLimitResponse;
  }

  // ... rest of handler
  return new Response(JSON.stringify(data), {
    headers: rateLimitResponse.headers,
  });
}
```

### Input Sanitization

**Sanitize User Input:**
```ts
// lib/security/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}

export function sanitizeText(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Use with Zod
export const ideaSchema = z.object({
  title: z.string().min(5).max(200).transform(sanitizeText),
  description: z.string().min(20).transform(sanitizeHTML),
  tags: z.array(z.string().transform(sanitizeText)),
});
```

### XSS Prevention

**Content Security Policy:**
```tsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={`
          default-src 'self';
          script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
          style-src 'self' 'unsafe-inline';
          img-src 'self' data: https:;
          font-src 'self' data:;
          connect-src 'self' https://api.helix-foundry.com https://*.supabase.co;
          frame-ancestors 'none';
          base-uri 'self';
          form-action 'self';
        `} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Next.js Security Headers:**
```js
// next.config.js
export async function headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'geolocation=(), microphone=(), camera=()',
        },
      ],
    },
  ];
}
```

### CORS Configuration

```ts
// lib/middleware/cors.ts
export function withCORS(request: Request) {
  const allowedOrigins = [
    'https://helix-foundry.com',
    'https://www.helix-foundry.com',
  ];

  const origin = request.headers.get('origin');
  const isAllowed = allowedOrigins.includes(origin || '');

  const headers = new Headers();

  if (isAllowed) {
    headers.set('Access-Control-Allow-Origin', origin!);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age', '86400');
  }

  return headers;
}
```

### SQL Injection Prevention

**Use Parameterized Queries (Already in place with Supabase):**
```ts
// Good: parameterized query
const { data } = await supabase
  .from('ideas')
  .select('*')
  .eq('project_id', projectId); // projectId is parameterized

// Bad: string concatenation (DON'T DO THIS)
// const query = `SELECT * FROM ideas WHERE project_id = '${projectId}'`;
```

### Authentication Security

**Session Security:**
```ts
// lib/auth/session.ts
export async function createSession(userId: string) {
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await supabase
    .from('sessions')
    .insert({
      token: sessionToken,
      user_id: userId,
      expires_at: expiresAt,
      ip_address: getClientIP(),
      user_agent: getUserAgent(),
    });

  return sessionToken;
}

export async function validateSession(token: string) {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .single();

  if (!data || new Date(data.expires_at) < new Date()) {
    return null;
  }

  return data;
}
```

**Password Security:**
```ts
import bcrypt from 'bcrypt';

// Hashing (never store plain password)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12); // cost of 12
}

// Verification
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Environment Variable Protection

**Audit Environment Variables:**
```bash
# Check for secrets in code
npm run security:audit

# Verify no secrets committed
git log -p | grep -i "password\|secret\|key" | head
```

**.env.production should contain:**
- Only non-sensitive config
- All secrets in Vercel/hosting provider

**Never commit:**
- Database URLs
- API keys
- Passwords
- JWT secrets

### Dependency Vulnerability Scanning

```bash
# Check for vulnerable dependencies
npm audit

# Auto-fix
npm audit fix

# Snyk for deeper scanning
npm install -g snyk
snyk test
```

### HTTPS & Transport Security

**Enforce HTTPS:**
```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && request.nextUrl.protocol !== 'https:') {
    return NextResponse.redirect(
      `https://${request.nextUrl.host}${request.nextUrl.pathname}`,
      301
    );
  }

  return NextResponse.next();
}
```

### Security Testing

**OWASP Top 10 Checklist:**
1. **Injection:** Parameterized queries, input validation ✓
2. **Broken Authentication:** Session management, password hashing ✓
3. **Sensitive Data:** HTTPS, encryption at rest ✓
4. **XML External Entities:** Not applicable (using JSON)
5. **Broken Access Control:** RLS policies, permission checks ✓
6. **Security Misconfiguration:** Headers, CORS configured ✓
7. **XSS:** CSP, input sanitization ✓
8. **Insecure Deserialization:** Using JSON safe parsing
9. **Using Components with Known Vulnerabilities:** Dependency scanning ✓
10. **Insufficient Logging & Monitoring:** Error tracking (Sentry) ✓

### Security Headers Verification

```bash
# Check security headers
curl -I https://helix-foundry.com

# Should include:
# Strict-Transport-Security
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy
# X-XSS-Protection
```

## File Structure
```
/lib/security/sanitize.ts
/lib/security/password.ts
/lib/middleware/rateLimit.ts
/lib/middleware/cors.ts
/lib/auth/session.ts
```

## Acceptance Criteria
- [ ] All RLS policies reviewed and verified
- [ ] No data leakage gaps identified
- [ ] API rate limiting implemented
- [ ] All public endpoints rate limited
- [ ] Input sanitization in place
- [ ] XSS prevention (CSP headers, sanitization)
- [ ] CSRF tokens on forms (if applicable)
- [ ] SQL injection prevented (parameterized queries)
- [ ] HTTPS enforced
- [ ] Security headers set
- [ ] CORS properly configured
- [ ] Sessions secure (httpOnly cookies, expiration)
- [ ] Passwords hashed (bcrypt or similar)
- [ ] No secrets in code or .env committed
- [ ] Dependencies audited for vulnerabilities
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting prevents brute force attacks

## Testing Instructions
1. **SQL Injection Test:**
   - Try to inject SQL: `'; DROP TABLE ideas; --` in form
   - Verify injection prevented (input escaped)

2. **XSS Test:**
   - Try: `<script>alert('xss')</script>` in text field
   - Verify script doesn't execute

3. **Rate Limiting Test:**
   - Make 100+ requests rapidly
   - Verify 429 response after limit
   - Wait for reset
   - Verify access restored

4. **CORS Test:**
   - Make request from different origin
   - Verify CORS headers correct
   - Verify unauthorized origins rejected

5. **RLS Test:**
   - As User A, try to access User B's data
   - Verify RLS prevents access

6. **Authentication Test:**
   - Try with invalid token
   - Verify 401 response
   - Try with expired session
   - Verify redirect to login

7. **Password Security:**
   - Test password strength requirements
   - Test password reset flow
   - Verify passwords hashed (not readable in DB)

8. **Security Headers:**
   - Run security header check
   - Verify all required headers present

9. **Dependency Audit:**
   - Run `npm audit`
   - Verify no high-severity vulnerabilities
   - Update dependencies with fixes
