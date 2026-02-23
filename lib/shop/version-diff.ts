/**
 * Diff and summary utilities for document versioning.
 * Operates on plain text extracted from HTML.
 */

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion'
  text: string
}

/**
 * Compute a simple line-based diff between two text strings.
 * Uses a basic LCS (Longest Common Subsequence) approach.
 */
export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: DiffLine[] = []

  // Build LCS table
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to produce diff
  let i = m
  let j = n
  const stack: DiffLine[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: 'context', text: oldLines[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'addition', text: newLines[j - 1] })
      j--
    } else {
      stack.push({ type: 'deletion', text: oldLines[i - 1] })
      i--
    }
  }

  // Reverse since we built from the bottom
  for (let k = stack.length - 1; k >= 0; k--) {
    result.push(stack[k])
  }

  return result
}

/**
 * Strip HTML tags to get plain text for diffing.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Calculate the magnitude of changes between two HTML strings.
 * Returns the total number of added + deleted characters.
 */
export function calculateChangeSize(oldHtml: string, newHtml: string): number {
  const oldText = stripHtml(oldHtml)
  const newText = stripHtml(newHtml)

  if (oldText === newText) return 0

  // Quick character-level difference check
  let commonPrefix = 0
  const minLen = Math.min(oldText.length, newText.length)
  while (commonPrefix < minLen && oldText[commonPrefix] === newText[commonPrefix]) {
    commonPrefix++
  }

  let commonSuffix = 0
  while (
    commonSuffix < minLen - commonPrefix &&
    oldText[oldText.length - 1 - commonSuffix] === newText[newText.length - 1 - commonSuffix]
  ) {
    commonSuffix++
  }

  const deletedLen = oldText.length - commonPrefix - commonSuffix
  const addedLen = newText.length - commonPrefix - commonSuffix

  return Math.max(0, deletedLen) + Math.max(0, addedLen)
}

/**
 * Generate an auto-summary for a version based on content diff.
 */
export function generateChangeSummary(oldHtml: string, newHtml: string): string {
  const oldText = stripHtml(oldHtml)
  const newText = stripHtml(newHtml)

  if (!oldText && newText) return 'Initial content'
  if (oldText && !newText) return 'Cleared all content'

  const diff = computeDiff(oldText, newText)
  const additions = diff.filter((d) => d.type === 'addition')
  const deletions = diff.filter((d) => d.type === 'deletion')

  const addedLines = additions.length
  const deletedLines = deletions.length

  // Check for section changes (lines starting with heading-like patterns)
  const addedSections = additions
    .filter((d) => d.text.trim().length > 0 && !d.text.startsWith(' '))
    .map((d) => d.text.trim())
    .slice(0, 2)

  if (addedSections.length > 0 && deletedLines === 0) {
    const section = addedSections[0].slice(0, 50)
    return addedSections.length === 1
      ? `Added: "${section}"`
      : `Added ${addedLines} lines including "${section}"`
  }

  if (addedLines === 0 && deletedLines > 0) {
    return `Removed ${deletedLines} line${deletedLines !== 1 ? 's' : ''}`
  }

  const parts: string[] = []
  if (addedLines > 0) parts.push(`${addedLines} added`)
  if (deletedLines > 0) parts.push(`${deletedLines} removed`)

  return `Updated content (${parts.join(', ')})`
}

// Minimum character change threshold for creating a version
export const VERSION_THRESHOLD = 10

// ── Word-level diff ──────────────────────────────────────────────────────

export interface DiffSegment {
  type: 'equal' | 'insert' | 'delete'
  text: string
}

/** Split text into word and whitespace tokens */
function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) || []
}

/** Compute word-level diff between two strings. */
export function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldTokens = tokenize(oldText)
  const newTokens = tokenize(newText)
  const m = oldTokens.length
  const n = newTokens.length

  if (m === 0 && n === 0) return []
  if (m === 0) return [{ type: 'insert', text: newText }]
  if (n === 0) return [{ type: 'delete', text: oldText }]

  // LCS on word tokens
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack
  const stack: DiffSegment[] = []
  let wi = m
  let wj = n
  while (wi > 0 || wj > 0) {
    if (wi > 0 && wj > 0 && oldTokens[wi - 1] === newTokens[wj - 1]) {
      stack.push({ type: 'equal', text: oldTokens[wi - 1] })
      wi--
      wj--
    } else if (wj > 0 && (wi === 0 || dp[wi][wj - 1] >= dp[wi - 1][wj])) {
      stack.push({ type: 'insert', text: newTokens[wj - 1] })
      wj--
    } else {
      stack.push({ type: 'delete', text: oldTokens[wi - 1] })
      wi--
    }
  }

  // Reverse and merge adjacent same-type segments
  const result: DiffSegment[] = []
  for (let k = stack.length - 1; k >= 0; k--) {
    const seg = stack[k]
    if (result.length > 0 && result[result.length - 1].type === seg.type) {
      result[result.length - 1].text += seg.text
    } else {
      result.push({ type: seg.type, text: seg.text })
    }
  }
  return result
}

// ── Side-by-side diff ────────────────────────────────────────────────────

export interface SideBySidePair {
  left: { text: string; type: 'context' | 'deletion' | 'empty'; lineNum: number | null; wordSegments?: DiffSegment[] }
  right: { text: string; type: 'context' | 'addition' | 'empty'; lineNum: number | null; wordSegments?: DiffSegment[] }
}

/** Convert unified DiffLine[] into side-by-side pairs with optional word-level highlighting. */
export function buildSideBySide(diff: DiffLine[], wordDiff = false): SideBySidePair[] {
  const pairs: SideBySidePair[] = []
  let leftNum = 0
  let rightNum = 0
  let idx = 0

  while (idx < diff.length) {
    if (diff[idx].type === 'context') {
      leftNum++
      rightNum++
      pairs.push({
        left: { text: diff[idx].text, type: 'context', lineNum: leftNum },
        right: { text: diff[idx].text, type: 'context', lineNum: rightNum },
      })
      idx++
    } else {
      const dels: string[] = []
      const adds: string[] = []
      while (idx < diff.length && diff[idx].type === 'deletion') {
        dels.push(diff[idx].text)
        idx++
      }
      while (idx < diff.length && diff[idx].type === 'addition') {
        adds.push(diff[idx].text)
        idx++
      }
      const maxLen = Math.max(dels.length, adds.length)
      const pairCount = Math.min(dels.length, adds.length)
      // Pre-compute word diffs for paired lines
      const wordDiffs: DiffSegment[][] = []
      if (wordDiff) {
        for (let k = 0; k < pairCount; k++) {
          wordDiffs.push(computeWordDiff(dels[k], adds[k]))
        }
      }
      for (let k = 0; k < maxLen; k++) {
        const hasDel = k < dels.length
        const hasAdd = k < adds.length
        if (hasDel) leftNum++
        if (hasAdd) rightNum++
        pairs.push({
          left: hasDel
            ? {
                text: dels[k],
                type: 'deletion',
                lineNum: leftNum,
                wordSegments: wordDiff && k < pairCount
                  ? wordDiffs[k].filter(s => s.type !== 'insert').map(s => ({ type: s.type === 'delete' ? 'delete' as const : 'equal' as const, text: s.text }))
                  : undefined,
              }
            : { text: '', type: 'empty', lineNum: null },
          right: hasAdd
            ? {
                text: adds[k],
                type: 'addition',
                lineNum: rightNum,
                wordSegments: wordDiff && k < pairCount
                  ? wordDiffs[k].filter(s => s.type !== 'delete').map(s => ({ type: s.type === 'insert' ? 'insert' as const : 'equal' as const, text: s.text }))
                  : undefined,
              }
            : { text: '', type: 'empty', lineNum: null },
        })
      }
    }
  }
  return pairs
}

// ── Unified diff with word highlights ────────────────────────────────────

export interface UnifiedDiffLine extends DiffLine {
  wordSegments?: DiffSegment[]
}

/** Enrich a unified diff with word-level segments for modification pairs. */
export function enrichUnifiedDiffWithWords(diff: DiffLine[]): UnifiedDiffLine[] {
  const result: UnifiedDiffLine[] = []
  let idx = 0

  while (idx < diff.length) {
    if (diff[idx].type === 'context') {
      result.push({ ...diff[idx] })
      idx++
      continue
    }
    const dels: DiffLine[] = []
    while (idx < diff.length && diff[idx].type === 'deletion') {
      dels.push(diff[idx])
      idx++
    }
    const adds: DiffLine[] = []
    while (idx < diff.length && diff[idx].type === 'addition') {
      adds.push(diff[idx])
      idx++
    }
    const pairCount = Math.min(dels.length, adds.length)
    const wordDiffs: DiffSegment[][] = []
    for (let k = 0; k < pairCount; k++) {
      wordDiffs.push(computeWordDiff(dels[k].text, adds[k].text))
    }
    for (let k = 0; k < dels.length; k++) {
      result.push({
        ...dels[k],
        wordSegments: k < pairCount
          ? wordDiffs[k].filter(s => s.type !== 'insert').map(s => ({ type: s.type === 'delete' ? 'delete' as const : 'equal' as const, text: s.text }))
          : undefined,
      })
    }
    for (let k = 0; k < adds.length; k++) {
      result.push({
        ...adds[k],
        wordSegments: k < pairCount
          ? wordDiffs[k].filter(s => s.type !== 'delete').map(s => ({ type: s.type === 'insert' ? 'insert' as const : 'equal' as const, text: s.text }))
          : undefined,
      })
    }
  }
  return result
}

// ── Diff statistics ──────────────────────────────────────────────────────

export interface DiffStats {
  linesAdded: number
  linesRemoved: number
  totalLines: number
  percentChanged: number
}

export function computeDiffStats(diff: DiffLine[]): DiffStats {
  const additions = diff.filter(d => d.type === 'addition').length
  const deletions = diff.filter(d => d.type === 'deletion').length
  const context = diff.filter(d => d.type === 'context').length
  const total = context + additions + deletions
  return {
    linesAdded: additions,
    linesRemoved: deletions,
    totalLines: total,
    percentChanged: total > 0 ? Math.round(((additions + deletions) / total) * 100) : 0,
  }
}
