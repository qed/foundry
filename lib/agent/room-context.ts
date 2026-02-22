/**
 * Control Room Agent context builder.
 * Provides blueprint-aware context for AI-assisted blueprint creation and review.
 */

export const ROOM_SYSTEM_PROMPT = `You are the Control Room Agent, an expert technical architect and software engineer.
Your role is to help engineers write technical blueprints that describe how features will be implemented.

You have access to:
- The current blueprint being viewed (if any)
- Foundation blueprints (technology decisions, conventions)
- System diagram blueprints (architecture references)
- Feature blueprints (implementation specs)
- Project architecture and technology decisions

Your capabilities:
1. Generate blueprint drafts based on feature requirements
2. Review blueprints for completeness, consistency, and clarity
3. Suggest improvements and identify gaps
4. Answer questions about blueprint best practices
5. Help with outline structure and content organization

When generating or reviewing blueprints, structure feedback clearly with sections:
- Solution Overview
- API Endpoints (if applicable)
- UI Components & Behavior (if applicable)
- Data Model Changes (if applicable)
- Business Logic (if applicable)
- Testing Requirements
- Dependencies

Guidelines:
- Be concise, technical, and actionable
- Use code examples where helpful
- Reference existing blueprints when relevant
- Flag inconsistencies between blueprints
- Suggest missing sections or requirements
- Keep responses focused and practical`

interface BlueprintSummary {
  id: string
  title: string
  blueprint_type: string
  status: string
  content_preview?: string
}

interface RoomContext {
  projectName: string
  currentBlueprint: BlueprintSummary | null
  foundations: BlueprintSummary[]
  systemDiagrams: BlueprintSummary[]
  featureBlueprints: BlueprintSummary[]
}

export function buildRoomContext(
  projectName: string,
  blueprints: { id: string; title: string; blueprint_type: string; status: string; content: unknown }[],
  currentBlueprintId: string | null
): RoomContext {
  const summarize = (bp: typeof blueprints[0], includeContent = false): BlueprintSummary => {
    const summary: BlueprintSummary = {
      id: bp.id,
      title: bp.title,
      blueprint_type: bp.blueprint_type,
      status: bp.status,
    }
    if (includeContent && bp.content) {
      const text = extractText(bp.content)
      summary.content_preview = text.slice(0, 2000)
    }
    return summary
  }

  const foundations = blueprints
    .filter((bp) => bp.blueprint_type === 'foundation')
    .map((bp) => summarize(bp, true))

  const systemDiagrams = blueprints
    .filter((bp) => bp.blueprint_type === 'system_diagram')
    .map((bp) => summarize(bp, true))

  const featureBlueprints = blueprints
    .filter((bp) => bp.blueprint_type === 'feature')
    .map((bp) => summarize(bp))

  let currentBlueprint: BlueprintSummary | null = null
  if (currentBlueprintId) {
    const bp = blueprints.find((b) => b.id === currentBlueprintId)
    if (bp) {
      currentBlueprint = summarize(bp, true)
    }
  }

  return {
    projectName,
    currentBlueprint,
    foundations,
    systemDiagrams,
    featureBlueprints,
  }
}

export function buildRoomSystemPrompt(context: RoomContext): string {
  const parts: string[] = [ROOM_SYSTEM_PROMPT]

  parts.push(`\n\n--- PROJECT CONTEXT ---`)
  parts.push(`Project: ${context.projectName}`)

  if (context.currentBlueprint) {
    parts.push(`\n## Currently Viewing`)
    parts.push(`Title: ${context.currentBlueprint.title}`)
    parts.push(`Type: ${context.currentBlueprint.blueprint_type}`)
    parts.push(`Status: ${context.currentBlueprint.status}`)
    if (context.currentBlueprint.content_preview) {
      parts.push(`Content:\n${context.currentBlueprint.content_preview}`)
    }
  }

  if (context.foundations.length > 0) {
    parts.push(`\n## Foundation Blueprints (${context.foundations.length})`)
    for (const f of context.foundations) {
      parts.push(`\n### ${f.title} [${f.status}]`)
      if (f.content_preview) {
        parts.push(f.content_preview)
      }
    }
  }

  if (context.systemDiagrams.length > 0) {
    parts.push(`\n## System Diagrams (${context.systemDiagrams.length})`)
    for (const d of context.systemDiagrams) {
      parts.push(`\n### ${d.title} [${d.status}]`)
      if (d.content_preview) {
        parts.push(d.content_preview)
      }
    }
  }

  if (context.featureBlueprints.length > 0) {
    parts.push(`\n## Feature Blueprints (${context.featureBlueprints.length})`)
    for (const fb of context.featureBlueprints.slice(0, 20)) {
      parts.push(`- ${fb.title} [${fb.status}]`)
    }
    if (context.featureBlueprints.length > 20) {
      parts.push(`  ... and ${context.featureBlueprints.length - 20} more`)
    }
  }

  // Cap total prompt size
  const prompt = parts.join('\n')
  if (prompt.length > 15000) {
    return prompt.slice(0, 15000) + '\n\n[Context truncated]'
  }
  return prompt
}

function extractText(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  const doc = content as { type?: string; content?: unknown[]; text?: string }
  if (doc.type === 'text' && doc.text) return doc.text
  if (Array.isArray(doc.content)) {
    return doc.content.map(extractText).join(' ')
  }
  return ''
}
