/**
 * CORS configuration for API routes.
 * Restricts cross-origin access to allowed domains.
 */

const ALLOWED_ORIGINS = [
  'https://helix-foundry.com',
  'https://www.helix-foundry.com',
]

// In development, allow localhost
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:3000', 'http://localhost:3001')
}

export function getCORSHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin')
  const headers: Record<string, string> = {}

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key'
    headers['Access-Control-Max-Age'] = '86400'
  }

  return headers
}

/** Handle OPTIONS preflight request */
export function handlePreflight(request: Request): Response {
  const headers = getCORSHeaders(request)
  return new Response(null, { status: 204, headers })
}
