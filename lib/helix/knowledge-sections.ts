/**
 * Knowledge capture section configuration for Step 2.2.
 * Defines the 8 structured sections for capturing undocumented knowledge.
 */

export interface KnowledgeSectionConfig {
  id: string
  title: string
  description: string
  placeholder: string
  maxCharacters: number
}

export const KNOWLEDGE_SECTIONS: KnowledgeSectionConfig[] = [
  {
    id: 'domain_knowledge',
    title: 'Domain Knowledge',
    description: 'Explain the core business, domain, and context this project operates in',
    placeholder: 'This project helps [users/teams] [do what]... The key domain concepts are...',
    maxCharacters: 5000,
  },
  {
    id: 'business_rules',
    title: 'Business Rules',
    description: 'List explicit business rules, constraints, and policies the system must enforce',
    placeholder: 'Rules include: 1) Only admins can..., 2) Users cannot..., 3) The system must always...',
    maxCharacters: 5000,
  },
  {
    id: 'edge_cases',
    title: 'Edge Cases & Exceptions',
    description: 'Document unusual scenarios, boundary conditions, and how they should be handled',
    placeholder: 'Edge cases: When [scenario], the system should [behavior]. If [condition], then [action]...',
    maxCharacters: 5000,
  },
  {
    id: 'user_workflows',
    title: 'User Workflows',
    description: 'Describe the key user journeys and workflows through the system',
    placeholder: 'Users typically start by [action], then [action], finally [action]... Advanced workflows include...',
    maxCharacters: 5000,
  },
  {
    id: 'design_preferences',
    title: 'Design Preferences',
    description: 'Explain design philosophy, style preferences, and interaction patterns',
    placeholder: 'We prefer [style]. The system should feel [descriptor]. Key interactions include...',
    maxCharacters: 5000,
  },
  {
    id: 'technical_constraints',
    title: 'Technical Constraints',
    description: 'Document technical limitations, dependencies, and architectural requirements',
    placeholder: 'We must use [technology]. We cannot use [technology] because... Performance targets are...',
    maxCharacters: 5000,
  },
  {
    id: 'success_criteria',
    title: 'Success Criteria',
    description: 'Define what success looks like for this project',
    placeholder: 'Success means [metric]. We win when [condition]. Key KPIs are...',
    maxCharacters: 5000,
  },
  {
    id: 'known_risks',
    title: 'Known Risks',
    description: 'Identify potential problems, risks, and mitigation strategies',
    placeholder: 'Risk: [description]. Impact: [severity]. Mitigation: [strategy]. Risk: ...',
    maxCharacters: 5000,
  },
]

export const MIN_SECTIONS_FOR_GATE = 3
export const MIN_CHARS_PER_SECTION = 50

export interface SectionData {
  title: string
  content: string
  character_count: number
  updated_at: string
}

export interface KnowledgeCaptureEvidence {
  evidence_type: 'knowledge_capture'
  created_at: string
  updated_at: string
  sections: Record<string, SectionData>
  sections_completed: number
  total_characters: number
  artifact_id: string | null
}

/**
 * Get plain text character count from HTML content.
 */
export function getPlainTextCharCount(html: string): number {
  return html.replace(/<[^>]*>/g, '').trim().length
}

/**
 * Calculate how many sections meet the minimum character threshold.
 */
export function countCompletedSections(
  sections: Record<string, SectionData>
): number {
  return Object.values(sections).filter(
    (s) => getPlainTextCharCount(s.content) >= MIN_CHARS_PER_SECTION
  ).length
}

/**
 * Calculate total character count across all sections.
 */
export function totalCharacterCount(
  sections: Record<string, SectionData>
): number {
  return Object.values(sections).reduce(
    (sum, s) => sum + getPlainTextCharCount(s.content),
    0
  )
}

/**
 * Build the evidence object for auto-save and completion.
 */
export function buildKnowledgeEvidence(
  sections: Record<string, SectionData>,
  artifactId: string | null = null
): KnowledgeCaptureEvidence {
  const now = new Date().toISOString()
  return {
    evidence_type: 'knowledge_capture',
    created_at: now,
    updated_at: now,
    sections,
    sections_completed: countCompletedSections(sections),
    total_characters: totalCharacterCount(sections),
    artifact_id: artifactId,
  }
}

/**
 * Create initial empty sections state.
 */
export function createInitialSections(): Record<string, SectionData> {
  const sections: Record<string, SectionData> = {}
  for (const config of KNOWLEDGE_SECTIONS) {
    sections[config.id] = {
      title: config.title,
      content: '',
      character_count: 0,
      updated_at: new Date().toISOString(),
    }
  }
  return sections
}

/**
 * Validate that the knowledge capture meets the minimum gate requirement.
 */
export function validateKnowledgeGate(
  sections: Record<string, SectionData>
): { valid: boolean; error: string | null } {
  const completed = countCompletedSections(sections)
  if (completed < MIN_SECTIONS_FOR_GATE) {
    return {
      valid: false,
      error: `Please fill in at least ${MIN_SECTIONS_FOR_GATE} sections (${completed} of ${KNOWLEDGE_SECTIONS.length} completed). Each section needs at least ${MIN_CHARS_PER_SECTION} characters.`,
    }
  }
  return { valid: true, error: null }
}
