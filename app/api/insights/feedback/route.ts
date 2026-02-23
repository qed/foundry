import { NextRequest } from 'next/server'
import type { Json } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/server'
import { validateEmail, sanitizeContent } from '@/lib/feedback/validation'
import { getUserAgentInfo, getDeviceType } from '@/lib/feedback/browser-utils'
import { checkRateLimit, rateLimitHeaders } from '@/lib/mcp/rate-limit'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Key',
}

// CORS preflight
export async function OPTIONS() {
  return Response.json({}, {
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    // 1. Extract and validate app key header
    const appKeyHeader = request.headers.get('X-App-Key')
    if (!appKeyHeader) {
      return Response.json(
        { error: 'Unauthorized', details: 'Missing X-App-Key header' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // 2. Parse request body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return Response.json(
        { error: 'Invalid request', details: 'Request body must be valid JSON' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // 3. Validate content
    if (!body.content || typeof body.content !== 'string') {
      return Response.json(
        { error: 'Invalid request', details: 'Content is required and must be a string' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const sanitizedContent = sanitizeContent(body.content as string)
    if (sanitizedContent.length < 10) {
      return Response.json(
        { error: 'Invalid request', details: 'Content must be between 10 and 5000 characters' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // 4. Validate optional email
    if (body.submitter_email) {
      if (typeof body.submitter_email !== 'string' || !validateEmail(body.submitter_email)) {
        return Response.json(
          { error: 'Invalid request', details: 'Invalid email format' },
          { status: 400, headers: CORS_HEADERS }
        )
      }
    }

    // 5. Validate optional name
    if (body.submitter_name) {
      if (typeof body.submitter_name !== 'string') {
        return Response.json(
          { error: 'Invalid request', details: 'Submitter name must be a string' },
          { status: 400, headers: CORS_HEADERS }
        )
      }
      if ((body.submitter_name as string).length > 255) {
        return Response.json(
          { error: 'Invalid request', details: 'Submitter name must be 255 characters or less' },
          { status: 400, headers: CORS_HEADERS }
        )
      }
    }

    // 6. Validate metadata size if provided
    if (body.metadata) {
      const metadataStr = JSON.stringify(body.metadata)
      if (metadataStr.length > 50 * 1024) {
        return Response.json(
          { error: 'Invalid request', details: 'Metadata must be less than 50KB' },
          { status: 400, headers: CORS_HEADERS }
        )
      }

      // Validate viewport if present
      const meta = body.metadata as Record<string, unknown>
      if (meta.viewport) {
        const vp = meta.viewport as Record<string, unknown>
        if (typeof vp.width !== 'number' || typeof vp.height !== 'number' || vp.width <= 0 || vp.height <= 0) {
          return Response.json(
            { error: 'Invalid request', details: 'Viewport must have width > 0 and height > 0' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
      }
    }

    // 7. Authenticate app key
    const supabase = createServiceClient()
    const { data: appKey, error: keyError } = await supabase
      .from('app_keys')
      .select('id, project_id, status')
      .eq('key_value', appKeyHeader)
      .eq('status', 'active')
      .single()

    if (keyError || !appKey) {
      return Response.json(
        { error: 'Unauthorized', details: 'Invalid or revoked app key' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // 8. Check rate limit (100 per minute)
    const rl = checkRateLimit(`feedback-${appKey.id}`, 100)
    const rlHeaders = rateLimitHeaders(rl)
    if (!rl.allowed) {
      return Response.json(
        { error: 'Too many requests', details: 'Rate limit exceeded: 100 per minute per app key' },
        { status: 429, headers: { ...CORS_HEADERS, ...rlHeaders, 'Retry-After': '60' } }
      )
    }

    // 9. Build metadata from headers + client metadata
    const uaInfo = getUserAgentInfo(request.headers.get('user-agent'))
    const deviceType = getDeviceType(uaInfo.userAgent)
    const clientMeta = (body.metadata || {}) as Record<string, unknown>

    const pageUrl = (clientMeta.page_url as string) || request.headers.get('referer') || null

    const metadata: Record<string, unknown> = {
      ...clientMeta,
      browser: uaInfo.browser,
      device: deviceType,
      page_url: pageUrl,
      user_agent: uaInfo.userAgent,
    }

    // 10. Insert feedback
    const { data: feedback, error: insertError } = await supabase
      .from('feedback_submissions')
      .insert({
        project_id: appKey.project_id,
        app_key_id: appKey.id,
        content: sanitizedContent,
        submitter_email: (body.submitter_email as string) || null,
        submitter_name: (body.submitter_name as string) || null,
        metadata: metadata as Json,
        category: 'uncategorized' as const,
        status: 'new' as const,
      })
      .select('id, project_id, category, status, created_at')
      .single()

    if (insertError) {
      console.error('Feedback insertion error:', insertError)
      return Response.json(
        { error: 'Server error', details: 'Failed to create feedback' },
        { status: 500, headers: { ...CORS_HEADERS, ...rlHeaders } }
      )
    }

    return Response.json(
      {
        id: feedback.id,
        project_id: feedback.project_id,
        category: feedback.category,
        status: feedback.status,
        created_at: feedback.created_at,
      },
      { status: 201, headers: { ...CORS_HEADERS, ...rlHeaders } }
    )
  } catch (error) {
    console.error('Unexpected feedback API error:', error)
    return Response.json(
      { error: 'Server error', details: 'An unexpected error occurred' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
