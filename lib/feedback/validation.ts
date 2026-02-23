/**
 * Validation utilities for the Feedback Collection API.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 255
}

export function sanitizeContent(content: string): string {
  return content
    .trim()
    .replace(/\x00/g, '') // Remove null bytes
    .slice(0, 5000) // Enforce max length
}
