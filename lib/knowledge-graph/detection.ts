import { createServiceClient } from '@/lib/supabase/server'
import { parseMentions } from '@/lib/mentions/parse'
import type { GraphEntityType, EntityConnectionType } from '@/types/database'

// --- Types ---

export interface DetectedConnection {
  target_type: GraphEntityType
  target_id: string
  target_name: string
  connection_type: EntityConnectionType
  confidence: number
  evidence: string[]
  method: 'mention' | 'name_match'
}

interface ProjectEntity {
  id: string
  type: GraphEntityType
  name: string
}

// --- Helpers ---

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getContextAround(content: string, position: number, radius: number): string {
  const start = Math.max(0, position - radius)
  const end = Math.min(content.length, position + radius)
  let snippet = content.substring(start, end).trim()
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'
  return snippet
}

// --- Confidence Scoring ---

export function calculateConfidence(method: 'mention' | 'name_match', matchCount: number): number {
  if (method === 'mention') return 100

  // Name match: base 70, +10 per additional match (max 20 bonus)
  let score = 70
  score += Math.min(20, matchCount * 10)

  // Reduce confidence if entity name appears too many times (common word)
  if (matchCount > 10) score -= 20

  return Math.max(0, Math.min(100, score))
}

// --- Connection Type Inference ---

const IMPLEMENT_KEYWORDS = ['implement', 'fulfill', 'realize', 'develop', 'build']
const DEPENDS_KEYWORDS = ['depend on', 'require', 'use', 'leverage', 'based on']
const COMPLEMENT_KEYWORDS = ['complement', 'enhance', 'augment', 'extend']

export function inferConnectionType(context: string): EntityConnectionType {
  const lower = context.toLowerCase()

  if (IMPLEMENT_KEYWORDS.some(k => lower.includes(k))) return 'implements'
  if (DEPENDS_KEYWORDS.some(k => lower.includes(k))) return 'depends_on'
  if (COMPLEMENT_KEYWORDS.some(k => lower.includes(k))) return 'complements'

  return 'references'
}

// --- Entity Fetching ---

async function getProjectEntities(projectId: string): Promise<ProjectEntity[]> {
  const supabase = createServiceClient()
  const entities: ProjectEntity[] = []

  const tableMap: { type: GraphEntityType; table: string; nameCol: string }[] = [
    { type: 'idea', table: 'ideas', nameCol: 'title' },
    { type: 'feature', table: 'feature_nodes', nameCol: 'name' },
    { type: 'blueprint', table: 'blueprints', nameCol: 'title' },
    { type: 'work_order', table: 'work_orders', nameCol: 'title' },
    { type: 'artifact', table: 'artifacts', nameCol: 'name' },
  ]

  const results = await Promise.all(
    tableMap.map(async ({ type, table, nameCol }) => {
      const { data } = await supabase
        .from(table)
        .select(`id, ${nameCol}`)
        .eq('project_id', projectId)

      if (!data) return []
      return data.map((row: Record<string, string>) => ({
        id: row.id,
        type,
        name: row[nameCol] || '',
      }))
    })
  )

  for (const batch of results) {
    entities.push(...batch)
  }

  return entities
}

// --- Reference Detection ---

function findEntityReferences(
  content: string,
  entities: ProjectEntity[],
  sourceType: GraphEntityType,
  sourceId: string
): DetectedConnection[] {
  const detections: DetectedConnection[] = []

  for (const entity of entities) {
    // Skip self-references
    if (entity.type === sourceType && entity.id === sourceId) continue

    // Skip entities with very short names (< 3 chars) to avoid false positives
    if (entity.name.length < 3) continue

    const regex = new RegExp(`\\b${escapeRegex(entity.name)}\\b`, 'gi')
    const matches = [...content.matchAll(regex)]

    if (matches.length > 0) {
      const confidence = calculateConfidence('name_match', matches.length)

      // Skip low confidence matches
      if (confidence < 50) continue

      // Get evidence snippets (up to 3)
      const evidence = matches.slice(0, 3).map(m =>
        getContextAround(content, m.index ?? 0, 60)
      )

      // Infer connection type from context around the first match
      const connectionType = inferConnectionType(
        getContextAround(content, matches[0].index ?? 0, 100)
      )

      detections.push({
        target_type: entity.type,
        target_id: entity.id,
        target_name: entity.name,
        connection_type: connectionType,
        confidence,
        evidence,
        method: 'name_match',
      })
    }
  }

  return detections
}

// --- Mention Type Mapping ---

const MENTION_TO_ENTITY_TYPE: Record<string, GraphEntityType | null> = {
  blueprint: 'blueprint',
  work_order: 'work_order',
  artifact: 'artifact',
  requirement_doc: null, // Not a graph entity type
  user: null, // Not an entity
}

// --- Main Scanner ---

export async function scanForConnections(
  projectId: string,
  sourceType: GraphEntityType,
  sourceId: string,
  content: string,
  title?: string
): Promise<DetectedConnection[]> {
  const fullContent = [title, content].filter(Boolean).join(' ')
  if (!fullContent.trim()) return []

  // 1. Extract @mentions from content
  const mentions = parseMentions(fullContent)
  const mentionDetections: DetectedConnection[] = []

  for (const mention of mentions) {
    const entityType = MENTION_TO_ENTITY_TYPE[mention.type]
    if (!entityType) continue

    // Skip self-references
    if (entityType === sourceType && mention.id === sourceId) continue

    mentionDetections.push({
      target_type: entityType,
      target_id: mention.id,
      target_name: mention.name,
      connection_type: 'references',
      confidence: 100,
      evidence: [mention.name],
      method: 'mention',
    })
  }

  // 2. Get all project entities and scan for name matches
  const entities = await getProjectEntities(projectId)
  const nameDetections = findEntityReferences(fullContent, entities, sourceType, sourceId)

  // 3. Merge: mentions take priority, deduplicate by target
  const seen = new Set<string>()
  const allDetections: DetectedConnection[] = []

  for (const d of mentionDetections) {
    const key = `${d.target_type}:${d.target_id}`
    if (seen.has(key)) continue
    seen.add(key)
    allDetections.push(d)
  }

  for (const d of nameDetections) {
    const key = `${d.target_type}:${d.target_id}`
    if (seen.has(key)) continue
    seen.add(key)
    allDetections.push(d)
  }

  // 4. Filter out existing connections
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('entity_connections')
    .select('target_type, target_id, connection_type')
    .eq('project_id', projectId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)

  if (existing && existing.length > 0) {
    const existingSet = new Set(
      existing.map(e => `${e.target_type}:${e.target_id}:${e.connection_type}`)
    )

    return allDetections.filter(d =>
      !existingSet.has(`${d.target_type}:${d.target_id}:${d.connection_type}`)
    )
  }

  return allDetections
}
