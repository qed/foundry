/**
 * System blueprint template definitions for seeding and runtime generation.
 * These define the outline_content stored in blueprint_templates table.
 */

export interface TemplateSection {
  id: string
  title: string
  placeholder: string
  required: boolean
  help_text?: string
}

export interface TemplateOutline {
  description: string
  sections: TemplateSection[]
}

export const FOUNDATION_TEMPLATE: TemplateOutline = {
  description: 'Standard foundation blueprint covering project-wide technical decisions and architecture.',
  sections: [
    { id: 'overview', title: 'Overview', placeholder: 'Provide a brief overview of this foundation area and its role in the project...', required: true, help_text: 'Describe the scope and purpose of this foundation area.' },
    { id: 'technology', title: 'Technology Choices', placeholder: 'List key technologies, versions, and rationale for choosing them...', required: true, help_text: 'Include versions and rationale for each choice.' },
    { id: 'principles', title: 'Architectural Principles', placeholder: 'List guiding principles and patterns (e.g., DRY, separation of concerns)...', required: true, help_text: 'Describe patterns the team should follow.' },
    { id: 'conventions', title: 'Conventions', placeholder: 'Code style, naming conventions, directory structure conventions...', required: true, help_text: 'Document team standards and naming rules.' },
    { id: 'constraints', title: 'Constraints & Limitations', placeholder: 'Known constraints, trade-offs, and future considerations...', required: false, help_text: 'Note any trade-offs or known limitations.' },
  ],
}

export const SYSTEM_DIAGRAM_TEMPLATE: TemplateOutline = {
  description: 'Standard system diagram template for Mermaid-based architecture diagrams.',
  sections: [
    { id: 'diagram', title: 'Diagram Code', placeholder: 'Write Mermaid syntax for your diagram...', required: true, help_text: 'Uses Mermaid.js syntax (flowchart, sequence, ER, class).' },
    { id: 'legend', title: 'Legend / Key', placeholder: 'Explain symbols, colors, and conventions used in the diagram...', required: false, help_text: 'Optional legend for complex diagrams.' },
  ],
}

export const FEATURE_TEMPLATE: TemplateOutline = {
  description: 'Standard feature blueprint covering solution design, APIs, UI, data, and testing.',
  sections: [
    { id: 'solution_overview', title: 'Solution Overview', placeholder: 'Describe what this feature does, why it\'s needed, and key benefits...', required: true, help_text: 'High-level summary of the feature.' },
    { id: 'api_endpoints', title: 'API Endpoints', placeholder: 'List all API endpoints with request/response formats...', required: true, help_text: 'Document every endpoint this feature needs.' },
    { id: 'ui_components', title: 'UI Components & Behavior', placeholder: 'List components, their state, user interactions, and behavior rules...', required: true, help_text: 'Describe the UI implementation plan.' },
    { id: 'data_model', title: 'Data Model Changes', placeholder: 'Describe database changes: new tables, columns, constraints...', required: true, help_text: 'Include migration details.' },
    { id: 'business_logic', title: 'Business Logic', placeholder: 'Describe business logic, calculations, workflows, algorithms...', required: true, help_text: 'Document core logic and edge cases.' },
    { id: 'testing', title: 'Testing Requirements', placeholder: 'List test cases, edge cases, unit tests, integration tests...', required: false, help_text: 'Define acceptance criteria and test plan.' },
    { id: 'dependencies', title: 'Dependencies', placeholder: 'List internal (features, systems) and external (APIs, libraries) dependencies...', required: false, help_text: 'Note what must be built or available first.' },
  ],
}

export const SYSTEM_TEMPLATES = [
  { name: 'Foundation Blueprint', blueprint_type: 'foundation' as const, outline: FOUNDATION_TEMPLATE },
  { name: 'System Diagram', blueprint_type: 'system_diagram' as const, outline: SYSTEM_DIAGRAM_TEMPLATE },
  { name: 'Feature Blueprint', blueprint_type: 'feature' as const, outline: FEATURE_TEMPLATE },
]

/**
 * Convert a TemplateOutline into TipTap JSONContent for blueprint initial content.
 */
export function outlineToTipTapContent(outline: TemplateOutline): {
  type: 'doc'
  content: Array<{ type: string; attrs?: Record<string, unknown>; content?: Array<{ type: string; text: string }> }>
} {
  const content: Array<{ type: string; attrs?: Record<string, unknown>; content?: Array<{ type: string; text: string }> }> = []

  for (const section of outline.sections) {
    content.push({
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: section.title }],
    })
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: section.placeholder }],
    })
  }

  return { type: 'doc', content }
}
