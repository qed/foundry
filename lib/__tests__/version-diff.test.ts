import { describe, it, expect } from 'vitest'
import {
  computeDiff,
  stripHtml,
  calculateChangeSize,
  generateChangeSummary,
  computeWordDiff,
  buildSideBySide,
  computeDiffStats,
} from '@/lib/shop/version-diff'

describe('computeDiff', () => {
  it('returns context lines for identical text', () => {
    const diff = computeDiff('hello\nworld', 'hello\nworld')
    expect(diff).toHaveLength(2)
    expect(diff.every((d) => d.type === 'context')).toBe(true)
  })

  it('detects additions', () => {
    const diff = computeDiff('hello', 'hello\nworld')
    expect(diff.some((d) => d.type === 'addition' && d.text === 'world')).toBe(true)
  })

  it('detects deletions', () => {
    const diff = computeDiff('hello\nworld', 'hello')
    expect(diff.some((d) => d.type === 'deletion' && d.text === 'world')).toBe(true)
  })

  it('handles empty to content', () => {
    const diff = computeDiff('', 'new content')
    const additions = diff.filter((d) => d.type === 'addition')
    expect(additions.length).toBeGreaterThanOrEqual(1)
    expect(additions[0].text).toBe('new content')
  })

  it('handles both empty', () => {
    const diff = computeDiff('', '')
    expect(diff).toHaveLength(1) // single empty line
  })
})

describe('stripHtml', () => {
  it('removes basic HTML tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello')
  })

  it('converts br tags to newlines', () => {
    expect(stripHtml('Hello<br/>World')).toBe('Hello\nWorld')
  })

  it('decodes HTML entities', () => {
    expect(stripHtml('&amp; &lt; &gt; &quot; &#39;')).toBe('& < > " \'')
  })

  it('converts &nbsp; to spaces', () => {
    expect(stripHtml('hello&nbsp;world')).toBe('hello world')
  })

  it('collapses excessive newlines', () => {
    expect(stripHtml('<p>A</p><p></p><p></p><p>B</p>')).toBe('A\n\nB')
  })
})

describe('calculateChangeSize', () => {
  it('returns 0 for identical content', () => {
    expect(calculateChangeSize('<p>Hello</p>', '<p>Hello</p>')).toBe(0)
  })

  it('returns change magnitude for different content', () => {
    const size = calculateChangeSize('<p>Hello</p>', '<p>Hello World</p>')
    expect(size).toBeGreaterThan(0)
  })
})

describe('generateChangeSummary', () => {
  it('returns "Initial content" for empty to content', () => {
    expect(generateChangeSummary('', '<p>Hello</p>')).toBe('Initial content')
  })

  it('returns "Cleared all content" for content to empty', () => {
    expect(generateChangeSummary('<p>Hello</p>', '')).toBe('Cleared all content')
  })

  it('describes additions when only lines are added', () => {
    const summary = generateChangeSummary('<p>Line 1</p>', '<p>Line 1</p><p>Line 2</p>')
    expect(summary).toContain('Added')
  })

  it('describes removals when only lines are deleted', () => {
    const summary = generateChangeSummary('<p>Line 1</p><p>Line 2</p>', '<p>Line 1</p>')
    expect(summary).toContain('Removed')
  })
})

describe('computeWordDiff', () => {
  it('returns empty array for two empty strings', () => {
    expect(computeWordDiff('', '')).toHaveLength(0)
  })

  it('returns insert for empty old text', () => {
    const diff = computeWordDiff('', 'hello world')
    expect(diff).toHaveLength(1)
    expect(diff[0].type).toBe('insert')
  })

  it('returns delete for empty new text', () => {
    const diff = computeWordDiff('hello world', '')
    expect(diff).toHaveLength(1)
    expect(diff[0].type).toBe('delete')
  })

  it('detects word-level changes', () => {
    const diff = computeWordDiff('the quick fox', 'the slow fox')
    const changed = diff.filter((d) => d.type !== 'equal')
    expect(changed.length).toBeGreaterThan(0)
  })
})

describe('buildSideBySide', () => {
  it('pairs context lines on both sides', () => {
    const diff = [{ type: 'context' as const, text: 'Hello' }]
    const pairs = buildSideBySide(diff)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].left.type).toBe('context')
    expect(pairs[0].right.type).toBe('context')
  })

  it('places deletions on left, additions on right', () => {
    const diff = [
      { type: 'deletion' as const, text: 'old' },
      { type: 'addition' as const, text: 'new' },
    ]
    const pairs = buildSideBySide(diff)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].left.type).toBe('deletion')
    expect(pairs[0].right.type).toBe('addition')
  })

  it('uses empty for unmatched lines', () => {
    const diff = [
      { type: 'deletion' as const, text: 'removed1' },
      { type: 'deletion' as const, text: 'removed2' },
      { type: 'addition' as const, text: 'added' },
    ]
    const pairs = buildSideBySide(diff)
    expect(pairs).toHaveLength(2)
    expect(pairs[1].right.type).toBe('empty')
  })
})

describe('computeDiffStats', () => {
  it('counts additions and deletions', () => {
    const diff = [
      { type: 'context' as const, text: 'kept' },
      { type: 'addition' as const, text: 'new' },
      { type: 'deletion' as const, text: 'old' },
    ]
    const stats = computeDiffStats(diff)
    expect(stats.linesAdded).toBe(1)
    expect(stats.linesRemoved).toBe(1)
    expect(stats.totalLines).toBe(3)
    expect(stats.percentChanged).toBe(67)
  })

  it('handles empty diff', () => {
    const stats = computeDiffStats([])
    expect(stats.totalLines).toBe(0)
    expect(stats.percentChanged).toBe(0)
  })
})
