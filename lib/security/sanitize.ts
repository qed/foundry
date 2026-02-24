/**
 * Input sanitization utilities.
 * Prevents XSS and injection attacks by cleaning user-provided content.
 */

/** Strip HTML tags from text input */
export function sanitizeText(input: string): string {
  return input.trim().replace(/<[^>]*>/g, '')
}

/** Sanitize HTML to only allow safe tags */
const ALLOWED_TAGS = new Set(['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3'])

export function sanitizeHTML(input: string): string {
  // Remove script tags and event handlers entirely
  let cleaned = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  cleaned = cleaned.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
  cleaned = cleaned.replace(/\son\w+\s*=\s*[^\s>]*/gi, '')
  // Remove javascript: URLs
  cleaned = cleaned.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')

  // Strip disallowed tags but keep content
  cleaned = cleaned.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    return ALLOWED_TAGS.has(tag.toLowerCase()) ? match : ''
  })

  return cleaned
}

/** Escape string for safe use in HTML attributes */
export function escapeHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
