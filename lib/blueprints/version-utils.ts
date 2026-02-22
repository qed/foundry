/**
 * Blueprint versioning utilities.
 * Handles text extraction from JSONB content, change detection,
 * summary generation, and diff computation for blueprint versions.
 */

import { computeDiff, type DiffLine } from '@/lib/shop/version-diff'

// Minimum character change to create a new version
export const BLUEPRINT_VERSION_THRESHOLD = 10

// Minimum seconds between auto-versions (2 minutes)
export const VERSION_DEBOUNCE_SECONDS = 120

/**
 * Extract plain text from TipTap JSONContent or Mermaid content.
 * Used for diffing and change detection.
 */
export function extractTextFromContent(content: unknown): string {
  if (!content || typeof content !== 'object') return ''

  const doc = content as Record<string, unknown>

  // Mermaid diagram content
  if (doc.type === 'mermaid' && typeof doc.code === 'string') {
    return doc.code
  }

  // TipTap text node
  if (doc.type === 'text' && typeof doc.text === 'string') {
    return doc.text
  }

  // TipTap heading — add newline after
  if (doc.type === 'heading' && Array.isArray(doc.content)) {
    const text = (doc.content as unknown[]).map(extractTextFromContent).join('')
    return text + '\n'
  }

  // TipTap paragraph — add newline after
  if (doc.type === 'paragraph' && Array.isArray(doc.content)) {
    const text = (doc.content as unknown[]).map(extractTextFromContent).join('')
    return text + '\n'
  }

  // TipTap list item
  if (doc.type === 'listItem' && Array.isArray(doc.content)) {
    return (doc.content as unknown[]).map(extractTextFromContent).join('')
  }

  // Recurse into content array
  if (Array.isArray(doc.content)) {
    return (doc.content as unknown[]).map(extractTextFromContent).join('')
  }

  return ''
}

/**
 * Calculate the magnitude of changes between two blueprint contents.
 * Returns total added + deleted character count.
 */
export function calculateBlueprintChangeSize(
  oldContent: unknown,
  newContent: unknown
): number {
  const oldText = extractTextFromContent(oldContent)
  const newText = extractTextFromContent(newContent)

  if (oldText === newText) return 0

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
 * Generate an auto-summary describing the changes between two versions.
 */
export function generateBlueprintChangeSummary(
  oldContent: unknown,
  newContent: unknown
): string {
  const oldText = extractTextFromContent(oldContent)
  const newText = extractTextFromContent(newContent)

  if (!oldText && newText) return 'Initial content'
  if (oldText && !newText) return 'Cleared all content'

  const diff = computeDiff(oldText, newText)
  const additions = diff.filter((d: DiffLine) => d.type === 'addition')
  const deletions = diff.filter((d: DiffLine) => d.type === 'deletion')

  const addedLines = additions.length
  const deletedLines = deletions.length

  // Check for notable added lines
  const addedSections = additions
    .filter((d: DiffLine) => d.text.trim().length > 0 && !d.text.startsWith(' '))
    .map((d: DiffLine) => d.text.trim())
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

/**
 * Compute a line-based diff between two blueprint contents.
 * Returns the diff lines from the shared computeDiff utility.
 */
export function computeBlueprintDiff(
  oldContent: unknown,
  newContent: unknown
): DiffLine[] {
  const oldText = extractTextFromContent(oldContent)
  const newText = extractTextFromContent(newContent)
  return computeDiff(oldText, newText)
}

/**
 * Convert TipTap JSONContent to markdown for download.
 */
export function contentToMarkdown(content: unknown): string {
  if (!content || typeof content !== 'object') return ''

  const doc = content as Record<string, unknown>

  // Mermaid diagram
  if (doc.type === 'mermaid' && typeof doc.code === 'string') {
    return `\`\`\`${doc.diagram_type || 'mermaid'}\n${doc.code}\n\`\`\``
  }

  // Text node
  if (doc.type === 'text') {
    let text = (doc.text as string) || ''
    const marks = doc.marks as { type: string; attrs?: Record<string, unknown> }[] | undefined
    if (marks) {
      for (const mark of marks) {
        if (mark.type === 'bold') text = `**${text}**`
        else if (mark.type === 'italic') text = `*${text}*`
        else if (mark.type === 'code') text = `\`${text}\``
        else if (mark.type === 'link' && mark.attrs?.href) text = `[${text}](${mark.attrs.href})`
      }
    }
    return text
  }

  const children = Array.isArray(doc.content)
    ? (doc.content as unknown[]).map(contentToMarkdown).join('')
    : ''

  // Heading
  if (doc.type === 'heading') {
    const level = (doc.attrs as Record<string, unknown>)?.level as number || 1
    return `${'#'.repeat(level)} ${children}\n\n`
  }

  // Paragraph
  if (doc.type === 'paragraph') {
    return `${children}\n\n`
  }

  // Bullet list
  if (doc.type === 'bulletList') {
    return Array.isArray(doc.content)
      ? (doc.content as unknown[])
          .map((item) => `- ${contentToMarkdown(item).trim()}`)
          .join('\n') + '\n\n'
      : ''
  }

  // Ordered list
  if (doc.type === 'orderedList') {
    return Array.isArray(doc.content)
      ? (doc.content as unknown[])
          .map((item, i) => `${i + 1}. ${contentToMarkdown(item).trim()}`)
          .join('\n') + '\n\n'
      : ''
  }

  // List item
  if (doc.type === 'listItem') {
    return children
  }

  // Code block
  if (doc.type === 'codeBlock') {
    const lang = (doc.attrs as Record<string, unknown>)?.language || ''
    return `\`\`\`${lang}\n${children}\`\`\`\n\n`
  }

  // Blockquote
  if (doc.type === 'blockquote') {
    return children
      .split('\n')
      .map((line: string) => `> ${line}`)
      .join('\n') + '\n\n'
  }

  // Horizontal rule
  if (doc.type === 'horizontalRule') {
    return '---\n\n'
  }

  // Table
  if (doc.type === 'table') {
    const rows = Array.isArray(doc.content) ? (doc.content as unknown[]) : []
    const lines: string[] = []
    rows.forEach((row, rowIdx) => {
      const rowDoc = row as Record<string, unknown>
      const cells = Array.isArray(rowDoc.content) ? (rowDoc.content as unknown[]) : []
      const cellTexts = cells.map((cell) => contentToMarkdown(cell).trim())
      lines.push(`| ${cellTexts.join(' | ')} |`)
      if (rowIdx === 0) {
        lines.push(`| ${cellTexts.map(() => '---').join(' | ')} |`)
      }
    })
    return lines.join('\n') + '\n\n'
  }

  // Doc or other container
  return children
}

export type BlueprintTriggerType = 'edit' | 'status_change' | 'ai_generated' | 'ai_review' | 'restore'
