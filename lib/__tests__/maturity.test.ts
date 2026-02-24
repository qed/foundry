import { describe, it, expect } from 'vitest'
import { calculateMaturity } from '@/lib/ideas/maturity'

function baseInput(overrides: Partial<Parameters<typeof calculateMaturity>[0]> = {}) {
  return {
    body: null,
    tagCount: 0,
    connectionCount: 0,
    artifactCount: 0,
    commentCount: 0,
    viewCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('calculateMaturity', () => {
  it('returns raw tier for minimal input', () => {
    const result = calculateMaturity(baseInput())
    expect(result.tier).toBe('raw')
    expect(result.total).toBeLessThan(34)
  })

  it('scores completeness for body > 100 chars', () => {
    const result = calculateMaturity(baseInput({ body: 'x'.repeat(101) }))
    expect(result.completeness).toBeGreaterThanOrEqual(10)
  })

  it('scores completeness for tags >= 2', () => {
    const result = calculateMaturity(baseInput({ tagCount: 2 }))
    expect(result.completeness).toBeGreaterThanOrEqual(10)
  })

  it('scores completeness for connections >= 1', () => {
    const result = calculateMaturity(baseInput({ connectionCount: 1 }))
    expect(result.completeness).toBeGreaterThanOrEqual(10)
  })

  it('scores completeness for artifacts >= 1', () => {
    const result = calculateMaturity(baseInput({ artifactCount: 1 }))
    expect(result.completeness).toBeGreaterThanOrEqual(10)
  })

  it('max completeness is 40', () => {
    const result = calculateMaturity(baseInput({
      body: 'x'.repeat(200),
      tagCount: 5,
      connectionCount: 3,
      artifactCount: 2,
    }))
    expect(result.completeness).toBe(40)
  })

  it('scores engagement for comments', () => {
    expect(calculateMaturity(baseInput({ commentCount: 1 })).engagement).toBe(5)
    expect(calculateMaturity(baseInput({ commentCount: 6 })).engagement).toBe(10)
    expect(calculateMaturity(baseInput({ commentCount: 11 })).engagement).toBe(15)
    expect(calculateMaturity(baseInput({ commentCount: 20 })).engagement).toBe(20)
  })

  it('scores engagement for views', () => {
    expect(calculateMaturity(baseInput({ viewCount: 1 })).engagement).toBe(5)
    expect(calculateMaturity(baseInput({ viewCount: 11 })).engagement).toBe(10)
    expect(calculateMaturity(baseInput({ viewCount: 51 })).engagement).toBe(15)
    expect(calculateMaturity(baseInput({ viewCount: 100 })).engagement).toBe(20)
  })

  it('max engagement is 40 (comments + views)', () => {
    const result = calculateMaturity(baseInput({ commentCount: 25, viewCount: 200 }))
    expect(result.engagement).toBe(40)
  })

  it('scores age 20 for ideas < 7 days old', () => {
    const result = calculateMaturity(baseInput({
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }))
    expect(result.age).toBe(20)
  })

  it('scores age 15 for ideas 7-30 days old', () => {
    const result = calculateMaturity(baseInput({
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    }))
    expect(result.age).toBe(15)
  })

  it('scores age 10 for ideas 31-90 days old', () => {
    const result = calculateMaturity(baseInput({
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    }))
    expect(result.age).toBe(10)
  })

  it('scores age 5 for ideas > 90 days old', () => {
    const result = calculateMaturity(baseInput({
      createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    }))
    expect(result.age).toBe(5)
  })

  it('returns developing tier for mid-range score', () => {
    const result = calculateMaturity(baseInput({
      body: 'x'.repeat(200),
      tagCount: 3,
      commentCount: 6,
      viewCount: 11,
    }))
    expect(result.tier).toBe('developing')
    expect(result.total).toBeGreaterThanOrEqual(34)
    expect(result.total).toBeLessThan(67)
  })

  it('returns mature tier for high score', () => {
    const result = calculateMaturity(baseInput({
      body: 'x'.repeat(200),
      tagCount: 5,
      connectionCount: 3,
      artifactCount: 2,
      commentCount: 25,
      viewCount: 200,
    }))
    expect(result.tier).toBe('mature')
    expect(result.total).toBeGreaterThanOrEqual(67)
  })
})
