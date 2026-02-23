import type { MentionType, ParsedMention } from './types'

// Match @[display name](type:uuid)
const MENTION_REGEX = /@\[([^\]]+)\]\(([a-z_]+):([a-f0-9-]+)\)/g

const VALID_TYPES = new Set<MentionType>([
  'user', 'requirement_doc', 'blueprint', 'work_order', 'artifact',
])

/**
 * Parse all mentions from a content string.
 * Returns an array of parsed mentions with their positions.
 */
export function parseMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = []
  let match: RegExpExecArray | null

  // Reset regex state
  MENTION_REGEX.lastIndex = 0

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    const type = match[2] as MentionType
    if (!VALID_TYPES.has(type)) continue

    mentions.push({
      name: match[1],
      type,
      id: match[3],
      offset: match.index,
      length: match[0].length,
    })
  }

  return mentions
}

/**
 * Build a mention string from its parts.
 */
export function buildMentionString(name: string, type: MentionType, id: string): string {
  return `@[${name}](${type}:${id})`
}

/**
 * Check if a content string contains any mentions.
 */
export function hasMentions(content: string): boolean {
  MENTION_REGEX.lastIndex = 0
  return MENTION_REGEX.test(content)
}
