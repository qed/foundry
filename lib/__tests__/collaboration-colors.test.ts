import { describe, it, expect } from 'vitest'
import { getUserColor } from '@/lib/collaboration/colors'

describe('getUserColor', () => {
  it('returns a hex color string', () => {
    const color = getUserColor('user-123')
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('is deterministic (same id = same color)', () => {
    const a = getUserColor('consistent-id')
    const b = getUserColor('consistent-id')
    expect(a).toBe(b)
  })

  it('different user IDs can produce different colors', () => {
    const colors = new Set(
      ['alice', 'bob', 'charlie', 'diana', 'eve'].map(getUserColor)
    )
    expect(colors.size).toBeGreaterThan(1)
  })

  it('handles empty string', () => {
    const color = getUserColor('')
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('handles long strings', () => {
    const color = getUserColor('a'.repeat(1000))
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
