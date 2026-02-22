/**
 * Export utilities for Pattern Shop — HTML-to-Markdown, tree-to-JSON/CSV/Markdown.
 */

// ─── HTML → Markdown ──────────────────────────────────────────────────────────

/**
 * Convert TipTap-generated HTML to clean Markdown.
 * Handles headings, bold, italic, underline, links, lists, code blocks,
 * blockquotes, and horizontal rules.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''

  let md = html

  // Remove any <br> at end of block elements
  md = md.replace(/<br\s*\/?>\s*<\/(p|li|h[1-6])>/g, '</$1>')

  // Code blocks: <pre><code>...</code></pre>
  md = md.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (_match, code: string) => {
    const decoded = decodeHtmlEntities(code.trim())
    return `\n\`\`\`\n${decoded}\n\`\`\`\n`
  })

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, (_m, c: string) => `\n# ${inlineToMd(c).trim()}\n`)
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, (_m, c: string) => `\n## ${inlineToMd(c).trim()}\n`)
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, (_m, c: string) => `\n### ${inlineToMd(c).trim()}\n`)

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g, (_m, c: string) => {
    const inner = inlineToMd(stripTags(c)).trim()
    return `\n${inner.split('\n').map(l => `> ${l}`).join('\n')}\n`
  })

  // Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (_m, c: string) => {
    return '\n' + convertListItems(c, 'ul') + '\n'
  })
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (_m, c: string) => {
    return '\n' + convertListItems(c, 'ol') + '\n'
  })

  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/g, (_m, c: string) => {
    const inner = inlineToMd(c).trim()
    return inner ? `\n${inner}\n` : '\n'
  })

  // Horizontal rules
  md = md.replace(/<hr\s*\/?>/g, '\n---\n')

  // Clean up any remaining tags
  md = stripTags(md)

  // Collapse excessive blank lines
  md = md.replace(/\n{3,}/g, '\n\n')

  return md.trim() + '\n'
}

function inlineToMd(html: string): string {
  let result = html

  // Inline code
  result = result.replace(/<code[^>]*>([\s\S]*?)<\/code>/g, '`$1`')

  // Bold
  result = result.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/g, '**$2**')

  // Italic
  result = result.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/g, '*$2*')

  // Underline (Markdown doesn't have native underline — use HTML)
  result = result.replace(/<u[^>]*>([\s\S]*?)<\/u>/g, '<u>$1</u>')

  // Links
  result = result.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)')

  // Line breaks
  result = result.replace(/<br\s*\/?>/g, '  \n')

  return decodeHtmlEntities(result)
}

function convertListItems(html: string, type: 'ul' | 'ol'): string {
  const items: string[] = []
  const regex = /<li[^>]*>([\s\S]*?)<\/li>/g
  let match
  let index = 0
  while ((match = regex.exec(html)) !== null) {
    const prefix = type === 'ul' ? '- ' : `${index + 1}. `
    const content = inlineToMd(stripTags(match[1])).trim()
    items.push(`${prefix}${content}`)
    index++
  }
  return items.join('\n')
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// ─── Styled HTML Export ───────────────────────────────────────────────────────

export function wrapInStyledHtml(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a2e; line-height: 1.6; }
  h1 { font-size: 2rem; border-bottom: 2px solid #00d4ff; padding-bottom: 0.5rem; }
  h2 { font-size: 1.5rem; color: #00d4ff; margin-top: 2rem; }
  h3 { font-size: 1.2rem; margin-top: 1.5rem; }
  code { background: #f0f0f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  pre { background: #1a1a2e; color: #e4e7ec; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  pre code { background: none; color: inherit; padding: 0; }
  blockquote { border-left: 3px solid #00d4ff; margin: 1rem 0; padding: 0.5rem 1rem; color: #555; }
  a { color: #00d4ff; }
  ul, ol { padding-left: 1.5rem; }
  hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
  .meta { font-size: 0.85rem; color: #888; margin-bottom: 2rem; }
  @media print { body { max-width: 100%; margin: 0; } }
</style>
</head>
<body>
<div class="meta">Exported from Helix Foundry &mdash; ${new Date().toLocaleDateString()}</div>
${contentHtml}
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Tree Export Utilities ────────────────────────────────────────────────────

export interface ExportTreeNode {
  id: string
  title: string
  description: string | null
  level: string
  status: string
  parent_id: string | null
  position: number
  children: ExportTreeNode[]
}

export function buildTreeJson(
  nodes: ExportTreeNode[],
  projectName: string,
  includeDescriptions: boolean
): object {
  function mapNode(node: ExportTreeNode): object {
    const result: Record<string, unknown> = {
      id: node.id,
      title: node.title,
      level: node.level,
      status: node.status,
    }
    if (includeDescriptions && node.description) {
      result.description = node.description
    }
    if (node.children.length > 0) {
      result.children = node.children.map(mapNode)
    } else {
      result.children = []
    }
    return result
  }

  return {
    project: { name: projectName },
    tree: {
      nodes: nodes.map(mapNode),
      metadata: {
        totalNodes: countNodes(nodes),
        exportedAt: new Date().toISOString(),
      },
    },
  }
}

export function buildTreeMarkdown(nodes: ExportTreeNode[], projectName: string): string {
  const lines: string[] = [`# Feature Tree: ${projectName}`, '']

  const LEVEL_ICONS: Record<string, string> = {
    epic: '📂',
    feature: '🧩',
    sub_feature: '🔧',
    task: '✔',
  }

  const STATUS_ICONS: Record<string, string> = {
    not_started: '⬜',
    in_progress: '⏳',
    complete: '✅',
    blocked: '❌',
  }

  function renderNode(node: ExportTreeNode, depth: number) {
    const indent = '  '.repeat(depth)
    const icon = LEVEL_ICONS[node.level] || '•'
    const status = STATUS_ICONS[node.status] || ''
    const levelLabel = node.level.replace(/_/g, ' ')
    lines.push(`${indent}- ${icon} ${node.title} (${levelLabel}, ${status} ${node.status.replace(/_/g, ' ')})`)
    for (const child of node.children) {
      renderNode(child, depth + 1)
    }
  }

  for (const node of nodes) {
    renderNode(node, 0)
  }

  return lines.join('\n') + '\n'
}

export function buildTreeCsv(flatNodes: FlatExportNode[]): string {
  const headers = ['ID', 'Title', 'Level', 'Status', 'Parent ID', 'Position', 'Description']
  const rows = flatNodes.map((n) => [
    n.id,
    csvEscape(n.title),
    n.level,
    n.status,
    n.parent_id || '',
    String(n.position),
    csvEscape(n.description || ''),
  ])
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n'
}

export interface FlatExportNode {
  id: string
  title: string
  description: string | null
  level: string
  status: string
  parent_id: string | null
  position: number
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function countNodes(nodes: ExportTreeNode[]): number {
  let count = 0
  for (const node of nodes) {
    count += 1 + countNodes(node.children)
  }
  return count
}

// ─── Concatenated FRDs Export ─────────────────────────────────────────────────

export interface ExportDoc {
  title: string
  content: string
  doc_type: string
  feature_node_id: string | null
}

export function buildAllFrdsMarkdown(docs: ExportDoc[], projectName: string): string {
  const lines: string[] = [
    `# ${projectName} — Requirements`,
    '',
    '## Table of Contents',
    '',
  ]

  docs.forEach((doc, i) => {
    lines.push(`${i + 1}. ${doc.title}`)
  })

  lines.push('', '---', '')

  docs.forEach((doc) => {
    lines.push(`## ${doc.title}`, '')
    lines.push(htmlToMarkdown(doc.content))
    lines.push('---', '')
  })

  return lines.join('\n')
}
