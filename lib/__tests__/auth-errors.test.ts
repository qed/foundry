import { describe, it, expect } from 'vitest'
import {
  AuthError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  handleAuthError,
} from '@/lib/auth/errors'

describe('Auth Error Classes', () => {
  it('AuthError has correct name and message', () => {
    const err = new AuthError('test')
    expect(err.name).toBe('AuthError')
    expect(err.message).toBe('test')
    expect(err).toBeInstanceOf(Error)
  })

  it('UnauthorizedError defaults to "Unauthorized"', () => {
    const err = new UnauthorizedError()
    expect(err.name).toBe('UnauthorizedError')
    expect(err.message).toBe('Unauthorized')
    expect(err).toBeInstanceOf(AuthError)
  })

  it('UnauthorizedError accepts custom message', () => {
    const err = new UnauthorizedError('Custom unauthorized')
    expect(err.message).toBe('Custom unauthorized')
  })

  it('ForbiddenError defaults to "Forbidden"', () => {
    const err = new ForbiddenError()
    expect(err.name).toBe('ForbiddenError')
    expect(err.message).toBe('Forbidden')
    expect(err).toBeInstanceOf(AuthError)
  })

  it('NotFoundError defaults to "Not found"', () => {
    const err = new NotFoundError()
    expect(err.name).toBe('NotFoundError')
    expect(err.message).toBe('Not found')
    expect(err).toBeInstanceOf(AuthError)
  })
})

describe('handleAuthError', () => {
  it('returns 401 for UnauthorizedError', async () => {
    const res = handleAuthError(new UnauthorizedError())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 for ForbiddenError', async () => {
    const res = handleAuthError(new ForbiddenError())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 404 for NotFoundError', async () => {
    const res = handleAuthError(new NotFoundError())
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
  })

  it('returns 400 for generic AuthError', async () => {
    const res = handleAuthError(new AuthError('Bad request'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Bad request')
  })

  it('returns 500 for unknown errors', async () => {
    const res = handleAuthError(new Error('unknown'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
  })

  it('returns 500 for non-Error objects', async () => {
    const res = handleAuthError('string error')
    expect(res.status).toBe(500)
  })
})
