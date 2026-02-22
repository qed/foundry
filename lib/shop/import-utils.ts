/**
 * Import utilities for Pattern Shop — Markdown-to-HTML, tree parsers.
 */

import { marked } from 'marked'
import type { FeatureLevel } from '@/types/database'

// ─── Markdown → HTML ──────────────────────────────────────────────────────────

/**
 * Convert Markdown to sanitized HTML using `marked`.
 */
export async function markdownToHtml(md: string): Promise<string> {
  const html = await marked.parse(md, { async: true })
  return sanitizeHtml(html)
}

/**
 * Basic HTML sanitizer — strips script tags, event handlers, and
 * dangerous attributes while preserving safe formatting elements.
 */
function sanitizeHtml(html: string): string {
  let result = html

  // Remove script/style tags and their contents
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '')
  result = result.replace(/<style[\s\S]*?<\/style>/gi, '')

  // Remove event handler attributes
  result = result.replace(/\s+on\w+="[^"]*"/gi, '')
  result = result.replace(/\s+on\w+='[^']*'/gi, '')

  // Remove javascript: URLs
  result = result.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"')
  result = result.replace(/src\s*=\s*"javascript:[^"]*"/gi, '')

  return result
}

/**
 * Extract a title from Markdown content. Uses the first H1, or the
 * first non-empty line, or falls back to the provided default.
 */
export function extractTitleFromMarkdown(md: string, fallback: string): string {
  // Try first H1
  const h1Match = md.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1].trim()

  // Try first non-empty line
  const firstLine = md.split('\n').find((l) => l.trim().length > 0)
  if (firstLine) {
    const cleaned = firstLine.replace(/^#+\s*/, '').trim()
    if (cleaned.length > 0 && cleaned.length <= 100) return cleaned
  }

  return fallback
}

/**
 * Convert plain text to basic HTML by wrapping lines in paragraphs
 * and preserving blank line breaks.
 */
export function plainTextToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

// ─── Tree Import Parsers ──────────────────────────────────────────────────────

export interface ParsedTreeNode {
  tempId: string
  parentTempId: string | null
  title: string
  description: string | null
  level: FeatureLevel
}

const VALID_LEVELS: FeatureLevel[] = ['epic', 'feature', 'sub_feature', 'task']

/**
 * Parse a feature tree JSON export back into bulk-create input.
 * Accepts the format produced by buildTreeJson.
 */
export function parseTreeJson(jsonString: string): ParsedTreeNode[] {
  const parsed = JSON.parse(jsonString)
  const nodes: ParsedTreeNode[] = []
  let counter = 0

  // Support both { tree: { nodes: [...] } } and bare array formats
  const treeNodes = parsed?.tree?.nodes || parsed?.nodes || (Array.isArray(parsed) ? parsed : null)

  if (!treeNodes || !Array.isArray(treeNodes)) {
    throw new Error('Invalid tree JSON: expected "tree.nodes" array or root array')
  }

  function walk(items: TreeJsonNode[], parentTempId: string | null) {
    for (const item of items) {
      const tempId = `import-${counter++}`
      const level = validateLevel(item.level)
      nodes.push({
        tempId,
        parentTempId,
        title: String(item.title || '').trim() || 'Untitled',
        description: item.description || null,
        level,
      })

      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children, tempId)
      }
    }
  }

  walk(treeNodes, null)
  return nodes
}

interface TreeJsonNode {
  title?: string
  level?: string
  description?: string | null
  children?: TreeJsonNode[]
}

/**
 * Parse a CSV feature tree export back into bulk-create input.
 * Expected columns: ID, Title, Level, Status, Parent ID, Position, Description
 */
export function parseTreeCsv(csvString: string): ParsedTreeNode[] {
  // Use simple CSV parsing — papaparse is available but we keep this self-contained
  const lines = csvString.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row')
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  const titleIdx = header.indexOf('title')
  const levelIdx = header.indexOf('level')
  const idIdx = header.indexOf('id')
  const parentIdIdx = header.indexOf('parent id')
  const descIdx = header.indexOf('description')

  if (titleIdx === -1 || levelIdx === -1) {
    throw new Error('CSV must have "Title" and "Level" columns')
  }

  const nodes: ParsedTreeNode[] = []
  const idToTempId = new Map<string, string>()
  let counter = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    if (cols.length <= titleIdx || cols.length <= levelIdx) continue

    const originalId = idIdx >= 0 ? cols[idIdx].trim() : ''
    const parentId = parentIdIdx >= 0 ? cols[parentIdIdx].trim() : ''
    const tempId = `csv-${counter++}`

    if (originalId) {
      idToTempId.set(originalId, tempId)
    }

    const level = validateLevel(cols[levelIdx].trim())

    nodes.push({
      tempId,
      parentTempId: parentId ? (idToTempId.get(parentId) || null) : null,
      title: cols[titleIdx].trim() || 'Untitled',
      description: descIdx >= 0 ? (cols[descIdx].trim() || null) : null,
      level,
    })
  }

  return nodes
}

function validateLevel(raw: string | undefined): FeatureLevel {
  const level = String(raw || '').toLowerCase().replace(/\s+/g, '_')
  if (VALID_LEVELS.includes(level as FeatureLevel)) {
    return level as FeatureLevel
  }
  // Best-effort mapping
  if (level === 'subfeature' || level === 'sub-feature') return 'sub_feature'
  return 'feature' // default fallback
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}
