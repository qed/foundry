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
