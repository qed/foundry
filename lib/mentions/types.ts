export type MentionType = 'user' | 'requirement_doc' | 'blueprint' | 'work_order' | 'artifact'

export interface MentionMatch {
  type: MentionType
  id: string
  name: string
  display: string
  avatar?: string | null
}

export interface ParsedMention {
  type: MentionType
  id: string
  name: string
  offset: number
  length: number
}

// Display labels for mention types
export const MENTION_TYPE_LABELS: Record<MentionType, string> = {
  user: 'People',
  requirement_doc: 'Documents',
  blueprint: 'Blueprints',
  work_order: 'Work Orders',
  artifact: 'Artifacts',
}
