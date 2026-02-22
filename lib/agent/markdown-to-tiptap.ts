/**
 * Convert markdown text to TipTap-compatible JSON content.
 * Handles headings, paragraphs, bullet/ordered lists, code blocks, and bold/italic.
 */

interface TipTapNode {
  type: string
  content?: TipTapNode[]
  text?: string
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  attrs?: Record<string, unknown>
}

export function markdownToTipTap(markdown: string): TipTapNode {
  const lines = markdown.split('\n')
  const nodes: TipTapNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines
    if (line.trim() === '') {
      i++
      continue
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || null
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      nodes.push({
        type: 'codeBlock',
        attrs: { language: lang },
        content: [{ type: 'text', text: codeLines.join('\n') }],
      })
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      nodes.push({
        type: 'heading',
        attrs: { level },
        content: parseInline(headingMatch[2].trim()),
      })
      i++
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      nodes.push({ type: 'horizontalRule' })
      i++
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line.trim())) {
      const items: TipTapNode[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s/, '')
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(itemText) }],
        })
        i++
      }
      nodes.push({ type: 'orderedList', content: items })
      continue
    }

    // Bullet list
    if (/^[-*]\s/.test(line.trim())) {
      const items: TipTapNode[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*]\s/, '')
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(itemText) }],
        })
        i++
      }
      nodes.push({ type: 'bulletList', content: items })
      continue
    }

    // Blockquote
    if (line.trim().startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2))
        i++
      }
      nodes.push({
        type: 'blockquote',
        content: [{ type: 'paragraph', content: parseInline(quoteLines.join(' ')) }],
      })
      continue
    }

    // Table (| col | col |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableRows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const row = lines[i].trim()
        // Skip separator rows (|---|---|)
        if (/^\|[\s-:|]+\|$/.test(row)) {
          i++
          continue
        }
        const cells = row
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim())
        tableRows.push(cells)
        i++
      }

      if (tableRows.length > 0) {
        const rows: TipTapNode[] = tableRows.map((cells, rowIdx) => ({
          type: 'tableRow',
          content: cells.map((cell) => ({
            type: rowIdx === 0 ? 'tableHeader' : 'tableCell',
            content: [{ type: 'paragraph', content: parseInline(cell) }],
          })),
        }))
        nodes.push({ type: 'table', content: rows })
      }
      continue
    }

    // Regular paragraph
    const paraLines: string[] = [line]
    i++
    // Collect continuation lines (not empty, not special)
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !/^\d+\.\s/.test(lines[i].trim()) &&
      !/^[-*]\s/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('> ') &&
      !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i])
      i++
    }

    nodes.push({
      type: 'paragraph',
      content: parseInline(paraLines.join(' ')),
    })
  }

  return {
    type: 'doc',
    content: nodes.length > 0 ? nodes : [{ type: 'paragraph', content: [] }],
  }
}

/**
 * Parse inline markdown (bold, italic, code, links) into TipTap text nodes.
 */
function parseInline(text: string): TipTapNode[] {
  const nodes: TipTapNode[] = []
  // Pattern matches: **bold**, *italic*, `code`, [text](url)
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index)
      if (before) nodes.push({ type: 'text', text: before })
    }

    if (match[2]) {
      // Bold
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'bold' }] })
    } else if (match[3]) {
      // Italic
      nodes.push({ type: 'text', text: match[3], marks: [{ type: 'italic' }] })
    } else if (match[4]) {
      // Inline code
      nodes.push({ type: 'text', text: match[4], marks: [{ type: 'code' }] })
    } else if (match[5] && match[6]) {
      // Link
      nodes.push({
        type: 'text',
        text: match[5],
        marks: [{ type: 'link', attrs: { href: match[6] } }],
      })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex)
    if (remaining) nodes.push({ type: 'text', text: remaining })
  }

  // If no nodes, return at least an empty text
  if (nodes.length === 0 && text) {
    nodes.push({ type: 'text', text })
  }

  return nodes
}
