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

// ─── Aggregate Project Export ─────────────────────────────────────────────────

export interface AggregateExportInput {
  projectName: string
  projectDescription: string | null
  orgName: string
  stats: { epics: number; features: number; subFeatures: number; tasks: number }
  overview: ExportDoc | null
  treeNodes: ExportTreeNode[]
  docs: ExportDoc[]
  includeDrafts: boolean
}

export function buildAggregateMarkdown(input: AggregateExportInput): string {
  const {
    projectName,
    projectDescription,
    orgName,
    stats,
    overview,
    treeNodes,
    docs,
  } = input

  const lines: string[] = []
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Title
  lines.push(`# ${projectName} — Complete Requirements`, '')
  lines.push(`**Organization:** ${orgName}`)
  lines.push(`**Exported:** ${date}`)
  if (projectDescription) lines.push(`**Description:** ${projectDescription}`)
  lines.push('')

  // Stats summary
  lines.push('## Project Summary', '')
  lines.push(`| Metric | Count |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Epics | ${stats.epics} |`)
  lines.push(`| Features | ${stats.features} |`)
  lines.push(`| Sub-features | ${stats.subFeatures} |`)
  lines.push(`| Tasks | ${stats.tasks} |`)
  lines.push(`| **Total Nodes** | **${stats.epics + stats.features + stats.subFeatures + stats.tasks}** |`)
  lines.push(`| Requirements Documents | ${docs.length} |`)
  lines.push('')

  // Table of contents
  lines.push('## Table of Contents', '')
  lines.push('1. [Project Overview](#project-overview)')
  lines.push('2. [Feature Tree](#feature-tree)')
  if (docs.length > 0) {
    lines.push('3. [Requirements Documents](#requirements-documents)')
    docs.forEach((doc, i) => {
      lines.push(`   ${i + 1}. ${doc.title}`)
    })
  }
  lines.push('', '---', '')

  // Project Overview
  lines.push('## Project Overview', '')
  if (overview?.content) {
    lines.push(htmlToMarkdown(overview.content))
  } else {
    lines.push('*No product overview defined.*', '')
  }
  lines.push('---', '')

  // Feature Tree
  lines.push('## Feature Tree', '')
  if (treeNodes.length > 0) {
    // Render tree with descriptions
    function renderNodeWithDesc(node: ExportTreeNode, depth: number) {
      const LEVEL_ICONS: Record<string, string> = { epic: '📂', feature: '🧩', sub_feature: '🔧', task: '✔' }
      const STATUS_ICONS: Record<string, string> = { not_started: '⬜', in_progress: '⏳', complete: '✅', blocked: '❌' }
      const indent = '  '.repeat(depth)
      const icon = LEVEL_ICONS[node.level] || '•'
      const status = STATUS_ICONS[node.status] || ''
      lines.push(`${indent}- ${icon} **${node.title}** ${status}`)
      if (node.description) {
        lines.push(`${indent}  ${node.description}`)
      }
      for (const child of node.children) {
        renderNodeWithDesc(child, depth + 1)
      }
    }
    for (const node of treeNodes) {
      renderNodeWithDesc(node, 0)
    }
  } else {
    lines.push('*No features defined.*')
  }
  lines.push('', '---', '')

  // Requirements Documents
  if (docs.length > 0) {
    lines.push('## Requirements Documents', '')
    docs.forEach((doc) => {
      const docType = doc.doc_type === 'product_overview'
        ? 'Product Overview'
        : doc.doc_type === 'feature_requirement'
          ? 'Functional Requirement'
          : doc.doc_type === 'technical_requirement'
            ? 'Technical Requirement'
            : doc.doc_type
      lines.push(`### ${doc.title}`, '')
      lines.push(`*Type: ${docType}*`, '')
      lines.push(htmlToMarkdown(doc.content))
      lines.push('---', '')
    })
  }

  // Footer
  lines.push(`*Generated by Helix Foundry on ${date}*`)

  return lines.join('\n')
}

export function buildAggregateHtml(input: AggregateExportInput): string {
  const markdown = buildAggregateMarkdown(input)
  // Convert markdown to simple HTML for styled display
  const contentHtml = markdownToSimpleHtml(markdown)
  return wrapInStyledHtml(`${input.projectName} — Complete Requirements`, contentHtml)
}

/** Simple markdown-to-HTML for export rendering (headings, bold, lists, code, tables, hr). */
function markdownToSimpleHtml(md: string): string {
  const lines = md.split('\n')
  const html: string[] = []
  let inCodeBlock = false
  let inTable = false

  for (const line of lines) {
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html.push('</code></pre>')
        inCodeBlock = false
      } else {
        html.push('<pre><code>')
        inCodeBlock = true
      }
      continue
    }
    if (inCodeBlock) {
      html.push(escapeHtml(line))
      continue
    }

    // Table rows
    if (line.startsWith('|')) {
      if (!inTable) {
        html.push('<table style="border-collapse: collapse; width: 100%; margin: 1rem 0;">')
        inTable = true
      }
      if (line.match(/^\|\s*[-:]+/)) continue // separator row
      const cells = line.split('|').filter(Boolean).map(c => c.trim())
      const tag = html.filter(h => h.includes('<tr')).length === 0 ? 'th' : 'td'
      const style = tag === 'th'
        ? ' style="border: 1px solid #ddd; padding: 6px 10px; background: #f5f5f5; text-align: left;"'
        : ' style="border: 1px solid #ddd; padding: 6px 10px;"'
      html.push(`<tr>${cells.map(c => `<${tag}${style}>${inlineMdToHtml(c)}</${tag}>`).join('')}</tr>`)
      continue
    }
    if (inTable && !line.startsWith('|')) {
      html.push('</table>')
      inTable = false
    }

    // Headings
    if (line.startsWith('### ')) { html.push(`<h3>${inlineMdToHtml(line.slice(4))}</h3>`); continue }
    if (line.startsWith('## ')) { html.push(`<h2>${inlineMdToHtml(line.slice(3))}</h2>`); continue }
    if (line.startsWith('# ')) { html.push(`<h1>${inlineMdToHtml(line.slice(2))}</h1>`); continue }

    // Horizontal rule
    if (line.match(/^---+$/)) { html.push('<hr>'); continue }

    // List items
    if (line.match(/^\s*[-*] /)) {
      html.push(`<li style="margin-left: ${(line.match(/^\s*/)?.[0].length || 0) * 8}px">${inlineMdToHtml(line.replace(/^\s*[-*] /, ''))}</li>`)
      continue
    }
    if (line.match(/^\s*\d+\. /)) {
      html.push(`<li style="margin-left: ${(line.match(/^\s*/)?.[0].length || 0) * 8}px">${inlineMdToHtml(line.replace(/^\s*\d+\. /, ''))}</li>`)
      continue
    }

    // Empty lines
    if (line.trim() === '') { html.push('<br>'); continue }

    // Paragraphs
    html.push(`<p>${inlineMdToHtml(line)}</p>`)
  }

  if (inTable) html.push('</table>')

  return html.join('\n')
}

function inlineMdToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

// ─── Concatenated FRDs Export ─────────────────────────────────────────────────

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
