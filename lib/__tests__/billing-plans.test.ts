import { describe, it, expect } from 'vitest'
import { getPlan, PLANS } from '@/lib/billing/plans'

describe('PLANS', () => {
  it('has free, pro, and enterprise plans', () => {
    const ids = PLANS.map((p) => p.id)
    expect(ids).toContain('free')
    expect(ids).toContain('pro')
    expect(ids).toContain('enterprise')
  })

  it('free plan has zero price', () => {
    const free = PLANS.find((p) => p.id === 'free')!
    expect(free.price).toBe(0)
    expect(free.priceAnnual).toBe(0)
  })

  it('pro plan has positive price', () => {
    const pro = PLANS.find((p) => p.id === 'pro')!
    expect(pro.price).toBeGreaterThan(0)
  })
})

describe('getPlan', () => {
  it('returns the correct plan by id', () => {
    const plan = getPlan('pro')
    expect(plan).toBeDefined()
    expect(plan!.name).toBe('Pro')
  })

  it('returns undefined for unknown plan', () => {
    expect(getPlan('nonexistent')).toBeUndefined()
  })
})
