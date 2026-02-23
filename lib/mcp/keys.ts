import { createHash, randomBytes } from 'crypto'

/**
 * Generate a new MCP API key.
 * Format: fnd_[randomHex64]
 * Returns the raw key (shown once) and the SHA-256 hash (stored).
 */
export function generateApiKey(): { raw: string; hash: string; preview: string } {
  const random = randomBytes(32).toString('hex')
  const raw = `fnd_${random}`
  const hash = hashApiKey(raw)
  const preview = raw.slice(-8)
  return { raw, hash, preview }
}

/**
 * Hash an API key using SHA-256 for storage and lookup.
 * SHA-256 is deterministic (unlike bcrypt) so we can do direct DB lookups.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Valid scopes for MCP connections.
 */
export const VALID_SCOPES = [
  'read:work-orders',
  'write:status',
  'write:assignment',
  'write:priority',
  'read:features',
  'read:phases',
  'write:create-work-orders',
  'admin:project',
] as const

export type McpScope = (typeof VALID_SCOPES)[number]

export function validateScopes(scopes: string[]): scopes is McpScope[] {
  return scopes.every((s) => (VALID_SCOPES as readonly string[]).includes(s))
}

export function hasScope(required: McpScope, granted: string[]): boolean {
  return granted.includes('admin:project') || granted.includes(required)
}
