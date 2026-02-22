import type { JSONContent } from '@tiptap/react'

/**
 * Default TipTap content template for feature blueprints.
 * Each section has a heading + placeholder paragraph.
 */
export function buildFeatureBlueprintTemplate(): JSONContent {
  return {
    type: 'doc',
    content: [
      heading(1, 'Solution Overview'),
      paragraph('Describe what this feature does, why it\'s needed, and key benefits...'),
      heading(1, 'API Endpoints'),
      paragraph('List all API endpoints:\n\nGET /api/...\nRequest:\n  ...\nResponse:\n  ...'),
      heading(1, 'UI Components & Behavior'),
      paragraph('List components, their state, user interactions, and behavior rules...'),
      heading(1, 'Data Model Changes'),
      paragraph('Describe database changes:\n- New tables:\n- New columns:\n- Constraints:'),
      heading(1, 'Business Logic'),
      paragraph('Describe business logic, calculations, workflows, algorithms...'),
      heading(1, 'Testing Requirements'),
      paragraph('List test cases, edge cases, unit tests, integration tests...'),
      heading(1, 'Dependencies'),
      paragraph('List internal (features, systems) and external (APIs, libraries) dependencies...'),
    ],
  }
}

function heading(level: number, text: string): JSONContent {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  }
}

function paragraph(text: string): JSONContent {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  }
}
