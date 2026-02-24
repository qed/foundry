import { describe, it, expect } from 'vitest'
import { validateEmail, sanitizeContent } from '@/lib/feedback/validation'

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true)
    expect(validateEmail('a@b.co')).toBe(true)
    expect(validateEmail('user+tag@domain.org')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('no-at-sign')).toBe(false)
    expect(validateEmail('spaces in@email.com')).toBe(false)
    expect(validateEmail('@no-local.com')).toBe(false)
  })

  it('rejects emails longer than 255 chars', () => {
    const longEmail = 'a'.repeat(250) + '@b.com'
    expect(validateEmail(longEmail)).toBe(false)
  })
})

describe('sanitizeContent', () => {
  it('trims whitespace', () => {
    expect(sanitizeContent('  hello  ')).toBe('hello')
  })

  it('removes null bytes', () => {
    expect(sanitizeContent('hello\x00world')).toBe('helloworld')
  })

  it('enforces 5000 char max', () => {
    const long = 'a'.repeat(6000)
    expect(sanitizeContent(long).length).toBe(5000)
  })

  it('handles empty string', () => {
    expect(sanitizeContent('')).toBe('')
  })
})
