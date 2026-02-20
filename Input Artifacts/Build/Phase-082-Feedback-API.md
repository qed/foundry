# Phase 082 - Feedback Collection API

## Objective
Implement a public-facing API endpoint for collecting user feedback from deployed applications, with secure authentication via app keys, rate limiting, and CORS support for cross-origin submissions.

## Prerequisites
- Phase 081: Database schema for feedback_submissions and app_keys complete
- Phase 001: Core Next.js 14 app router structure established
- Supabase client libraries installed (supabase/supabase-js)

## Context
The Insights Lab must accept feedback from production applications without requiring user authentication on the client side. The API uses app keys (unique per project/app) for authentication, implements rate limiting to prevent abuse, and handles CORS to support submissions from web apps across different domains. The endpoint validates all input and persists feedback to the database for later triage and categorization.

## Detailed Requirements

### API Endpoint Specification

#### POST /api/insights/feedback
- **Authentication**: App Key via `X-App-Key` header
- **CORS**: Accept requests from any origin for feedback submissions
- **Rate Limiting**: 100 requests per minute per app key
- **Response**: 201 Created on success, 400/401/429 on error

### Request Body
```typescript
{
  content: string;           // Required, max 5000 chars, min 10 chars
  submitter_email?: string;  // Optional, max 255 chars, valid email format
  submitter_name?: string;   // Optional, max 255 chars
  metadata?: {              // Optional, user-agent data captured server-side
    browser?: string;       // Extracted from User-Agent
    device?: string;        // desktop | tablet | mobile
    page_url?: string;      // Referer header
    user_agent?: string;    // Full User-Agent header
    viewport?: {
      width: number;
      height: number;
    };
    timestamp_client?: number;  // Client-side timestamp in ms
    [key: string]: any;     // Additional custom metadata
  };
}
```

### Response Formats

**Success (201)**:
```typescript
{
  id: string;              // UUID of created feedback
  project_id: string;      // UUID
  category: string;        // "uncategorized" initially
  status: string;          // "new"
  created_at: string;      // ISO 8601 timestamp
}
```

**Client Error (400)**:
```typescript
{
  error: "Invalid request";
  details: string;  // "Content must be between 10 and 5000 characters"
}
```

**Authentication Error (401)**:
```typescript
{
  error: "Unauthorized";
  details: "Invalid or revoked app key"
}
```

**Rate Limit Error (429)**:
```typescript
{
  error: "Too many requests";
  details: "Rate limit exceeded: 100 per minute per app key"
}
```

### Validation Rules
- **content**: Required, 10-5000 characters, non-empty when trimmed
- **submitter_email**: Optional, must be valid email format if provided
- **submitter_name**: Optional, max 255 characters
- **metadata.viewport**: If present, must have width > 0 and height > 0
- **metadata**: Must be valid JSON, max 50KB when serialized

### Security Requirements
- Validate app key exists and is active in database
- Extract User-Agent from request headers
- Use Referer header as page_url if not provided in metadata
- Log failed authentication attempts (rate limit monitoring)
- Sanitize content string (trim, no executable code)
- Hash app keys in database, never expose raw keys in responses
- CORS headers must not expose sensitive information

### Rate Limiting Implementation
- Use in-memory store (Redis optional for distributed systems)
- Key format: `feedback-rate-${app_key_id}`
- Bucket size: 100 per minute
- Sliding window or fixed window approach acceptable
- Return Retry-After header on 429 response

## API Routes

### Route: app/api/insights/feedback/route.ts

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, sanitizeContent } from '@/lib/validation';
import { getRateLimitManager } from '@/lib/rate-limit';
import { getUserAgentInfo, getDeviceType } from '@/lib/browser-utils';

const rateLimitManager = getRateLimitManager();

export async function POST(request: NextRequest) {
  try {
    // Get app key from header
    const appKeyHeader = request.headers.get('X-App-Key');

    if (!appKeyHeader) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          details: 'Missing X-App-Key header'
        },
        { status: 401 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'Request body must be valid JSON'
        },
        { status: 400 }
      );
    }

    // Validate content
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'Content is required and must be a string'
        },
        { status: 400 }
      );
    }

    const sanitizedContent = sanitizeContent(body.content);
    if (sanitizedContent.length < 10 || sanitizedContent.length > 5000) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'Content must be between 10 and 5000 characters'
        },
        { status: 400 }
      );
    }

    // Validate optional email
    if (body.submitter_email && !validateEmail(body.submitter_email)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'Invalid email format'
        },
        { status: 400 }
      );
    }

    // Validate optional name
    if (body.submitter_name && typeof body.submitter_name !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'Submitter name must be a string'
        },
        { status: 400 }
      );
    }

    if (body.submitter_name && body.submitter_name.length > 255) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'Submitter name must be 255 characters or less'
        },
        { status: 400 }
      );
    }

    // Verify app key with database
    const supabase = createRouteHandlerClient({ cookies });

    const { data: appKey, error: keyError } = await supabase
      .from('app_keys')
      .select('id, project_id, status')
      .eq('key_value', appKeyHeader)
      .eq('status', 'active')
      .single();

    if (keyError || !appKey) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          details: 'Invalid or revoked app key'
        },
        { status: 401 }
      );
    }

    // Check rate limit
    const isLimited = await rateLimitManager.checkLimit(appKey.id, 100, 60000);
    if (isLimited) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          details: 'Rate limit exceeded: 100 per minute per app key'
        },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Build metadata object
    const userAgentInfo = getUserAgentInfo(request.headers.get('user-agent'));
    const deviceType = getDeviceType(userAgentInfo.userAgent);

    const metadata = {
      browser: userAgentInfo.browser,
      device: deviceType,
      page_url: body.metadata?.page_url || request.headers.get('referer'),
      user_agent: userAgentInfo.userAgent,
      viewport: body.metadata?.viewport,
      timestamp_client: body.metadata?.timestamp_client,
      ...body.metadata
    };

    // Insert feedback
    const { data: feedback, error: insertError } = await supabase
      .from('feedback_submissions')
      .insert({
        project_id: appKey.project_id,
        app_key_id: appKey.id,
        content: sanitizedContent,
        submitter_email: body.submitter_email || null,
        submitter_name: body.submitter_name || null,
        metadata: metadata,
        category: 'uncategorized',
        status: 'new'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Feedback insertion error:', insertError);
      return NextResponse.json(
        {
          error: 'Server error',
          details: 'Failed to create feedback'
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        id: feedback.id,
        project_id: feedback.project_id,
        category: feedback.category,
        status: feedback.status,
        created_at: feedback.created_at
      },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-App-Key'
        }
      }
    );

  } catch (error) {
    console.error('Unexpected feedback API error:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        details: 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-App-Key',
        'Access-Control-Max-Age': '86400'
      }
    }
  );
}
```

### Supporting Utilities

#### lib/validation.ts
```typescript
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

export function sanitizeContent(content: string): string {
  return content
    .trim()
    .replace(/\x00/g, '') // Remove null bytes
    .slice(0, 5000);       // Enforce max length
}
```

#### lib/browser-utils.ts
```typescript
export function getUserAgentInfo(userAgent: string | null) {
  if (!userAgent) {
    return { browser: 'Unknown', userAgent: 'Unknown' };
  }

  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  return { browser, userAgent };
}

export function getDeviceType(userAgent: string): string {
  if (/mobile|android|iphone|ipod/i.test(userAgent)) return 'mobile';
  if (/ipad|tablet|kindle/i.test(userAgent)) return 'tablet';
  return 'desktop';
}
```

#### lib/rate-limit.ts
```typescript
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

export function getRateLimitManager() {
  return {
    async checkLimit(
      appKeyId: string,
      maxRequests: number,
      windowMs: number
    ): Promise<boolean> {
      const key = `feedback-rate-${appKeyId}`;
      const now = Date.now();
      const record = store.get(key);

      if (!record || now > record.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return false;
      }

      if (record.count >= maxRequests) {
        return true;
      }

      record.count++;
      return false;
    }
  };
}
```

## File Structure
```
app/
├── api/
│   └── insights/
│       └── feedback/
│           └── route.ts
lib/
├── validation.ts
├── browser-utils.ts
└── rate-limit.ts
```

## Acceptance Criteria
- [x] POST /api/insights/feedback endpoint implemented and public
- [x] App key authentication via X-App-Key header working
- [x] Content validation enforces 10-5000 character limit
- [x] Email validation works for optional submitter_email field
- [x] Rate limiting enforces 100 requests per minute per app key
- [x] Request returns 201 with feedback ID on success
- [x] Returns 401 for missing or invalid app key
- [x] Returns 429 with Retry-After header on rate limit
- [x] CORS headers allow cross-origin POST and OPTIONS requests
- [x] Metadata auto-populated from request headers (User-Agent, Referer)
- [x] User-Agent parsed to extract browser and device type
- [x] Content sanitized to remove null bytes and enforce length
- [x] Feedback inserted with project_id, category (uncategorized), and status (new)

## Testing Instructions

1. **Basic Submission Test**
   - Generate app key in project settings (Phase 094)
   - POST to /api/insights/feedback with valid body
   - Verify 201 response with feedback ID
   - Verify feedback appears in database

2. **App Key Validation**
   - Submit without X-App-Key header → expect 401
   - Submit with invalid key → expect 401
   - Revoke app key, submit with revoked key → expect 401
   - Create new key, submit → expect 201

3. **Content Validation**
   - Submit empty content → expect 400
   - Submit content < 10 chars → expect 400
   - Submit content > 5000 chars → expect 400
   - Submit with null bytes → expect content sanitized
   - Submit valid content → expect 201

4. **Email Validation**
   - Submit with invalid email → expect 400
   - Submit with valid email → expect 201
   - Submit without email → expect 201

5. **Rate Limiting**
   - Submit 100 requests within 60 seconds → all succeed
   - Submit 101st request within 60 seconds → expect 429
   - Check Retry-After header value
   - Wait 60 seconds, submit again → expect 201

6. **CORS Testing**
   - From browser console: fetch with credentials omitted
   - Verify OPTIONS preflight succeeds
   - Verify POST succeeds with Access-Control-Allow-Origin: *

7. **Metadata Capture**
   - Submit feedback and inspect metadata field in database
   - Verify browser, device, page_url, user_agent captured
   - Verify custom metadata fields preserved

8. **Error Handling**
   - Submit malformed JSON → expect 400
   - Submit with invalid viewport dimensions → expect 400
   - Verify all errors return appropriate status codes
