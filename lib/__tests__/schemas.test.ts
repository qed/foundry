import { describe, it, expect } from 'vitest'
import { loginSchema, signupSchema, resetPasswordSchema } from '@/lib/schemas/auth'
import { createIdeaSchema, updateIdeaSchema } from '@/lib/schemas/hall'
import { validateRequest } from '@/lib/schemas/validate'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('signupSchema', () => {
  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional displayName', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      displayName: 'Test User',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.displayName).toBe('Test User')
    }
  })

  it('rejects short password', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password over 128 chars', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'a'.repeat(129),
    })
    expect(result.success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = resetPasswordSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = resetPasswordSchema.safeParse({ email: 'bad' })
    expect(result.success).toBe(false)
  })
})

describe('createIdeaSchema', () => {
  it('accepts valid idea', () => {
    const result = createIdeaSchema.safeParse({ title: 'My Idea' })
    expect(result.success).toBe(true)
  })

  it('accepts idea with body and tags', () => {
    const result = createIdeaSchema.safeParse({
      title: 'My Idea',
      body: 'Some description',
      tag_ids: ['550e8400-e29b-41d4-a716-446655440000'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects title shorter than 3 chars', () => {
    const result = createIdeaSchema.safeParse({ title: 'ab' })
    expect(result.success).toBe(false)
  })

  it('rejects title over 200 chars', () => {
    const result = createIdeaSchema.safeParse({ title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid tag UUIDs', () => {
    const result = createIdeaSchema.safeParse({
      title: 'My Idea',
      tag_ids: ['not-a-uuid'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts null body', () => {
    const result = createIdeaSchema.safeParse({ title: 'My Idea', body: null })
    expect(result.success).toBe(true)
  })
})

describe('updateIdeaSchema', () => {
  it('accepts partial updates', () => {
    const result = updateIdeaSchema.safeParse({ title: 'Updated Title' })
    expect(result.success).toBe(true)
  })

  it('accepts status update', () => {
    const result = updateIdeaSchema.safeParse({ status: 'mature' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = updateIdeaSchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('accepts empty object (no changes)', () => {
    const result = updateIdeaSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('validateRequest', () => {
  function makeRequest(body: unknown): Request {
    return new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns data for valid input', async () => {
    const req = makeRequest({ email: 'user@example.com', password: 'secret' })
    const result = await validateRequest(req, loginSchema)
    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.data.email).toBe('user@example.com')
    }
  })

  it('returns error response for invalid input', async () => {
    const req = makeRequest({ email: 'bad' })
    const result = await validateRequest(req, loginSchema)
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(400)
      const body = await result.error.json()
      expect(body.error).toBe('Validation failed')
      expect(body.issues).toBeDefined()
    }
  })

  it('returns error for invalid JSON', async () => {
    const req = new Request('http://localhost/test', {
      method: 'POST',
      body: 'not json',
    })
    const result = await validateRequest(req, loginSchema)
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(400)
      const body = await result.error.json()
      expect(body.error).toBe('Invalid JSON body')
    }
  })
})
