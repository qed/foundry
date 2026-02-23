'use client'

import React from 'react'
import { parseMentions } from '@/lib/mentions/parse'
import { MentionChip } from './mention-chip'

interface RenderMentionsProps {
  content: string
  onMentionClick?: (type: string, id: string) => void
}

/**
 * Renders a content string, replacing mention syntax with styled MentionChip components.
 * Plain text segments are preserved with whitespace handling.
 */
export function RenderMentions({ content, onMentionClick }: RenderMentionsProps) {
  const mentions = parseMentions(content)

  if (mentions.length === 0) {
    return <>{content}</>
  }

  const parts: React.ReactNode[] = []
  let lastEnd = 0

  for (let i = 0; i < mentions.length; i++) {
    const mention = mentions[i]

    // Text before this mention
    if (mention.offset > lastEnd) {
      parts.push(
        <React.Fragment key={`text-${i}`}>
          {content.substring(lastEnd, mention.offset)}
        </React.Fragment>
      )
    }

    parts.push(
      <MentionChip
        key={`mention-${i}`}
        type={mention.type}
        name={mention.name}
        mentionedId={mention.id}
        onClick={onMentionClick ? () => onMentionClick(mention.type, mention.id) : undefined}
      />
    )

    lastEnd = mention.offset + mention.length
  }

  // Remaining text after last mention
  if (lastEnd < content.length) {
    parts.push(
      <React.Fragment key="text-tail">
        {content.substring(lastEnd)}
      </React.Fragment>
    )
  }

  return <>{parts}</>
}
