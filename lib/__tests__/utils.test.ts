import { describe, it, expect } from 'vitest'
import { cn, timeAgo } from '@/lib/utils'

describe('cn (className merge)', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })

  it('deduplicates Tailwind classes', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6')
  })

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })
})

describe('timeAgo', () => {
  it('returns "just now" for recent dates', () => {
    const now = new Date()
    expect(timeAgo(now)).toBe('just now')
  })

  it('returns minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000)
    expect(timeAgo(date)).toBe('5m ago')
  })

  it('returns hours ago', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000)
    expect(timeAgo(date)).toBe('3h ago')
  })

  it('returns days ago', () => {
    const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    expect(timeAgo(date)).toBe('7d ago')
  })

  it('returns months ago', () => {
    const date = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    expect(timeAgo(date)).toBe('3mo ago')
  })

  it('returns years ago', () => {
    const date = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000)
    expect(timeAgo(date)).toBe('1y ago')
  })

  it('accepts string dates', () => {
    const date = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(timeAgo(date)).toBe('2h ago')
  })
})
