import type { JSONContent } from '@tiptap/react'

/**
 * Default TipTap content template for foundation blueprints.
 * 5 sections covering project-wide technical decisions.
 */
export function buildFoundationBlueprintTemplate(): JSONContent {
  return {
    type: 'doc',
    content: [
      heading(1, 'Overview'),
      paragraph('Provide a brief overview of this foundation area and its role in the project...'),
      heading(1, 'Technology Choices'),
      paragraph('List key technologies, versions, and rationale for choosing them...'),
      heading(1, 'Architectural Principles'),
      paragraph('List guiding principles and patterns (e.g., DRY, separation of concerns)...'),
      heading(1, 'Conventions'),
      paragraph('Code style, naming conventions, directory structure conventions...'),
      heading(1, 'Constraints & Limitations'),
      paragraph('Known constraints, trade-offs, and future considerations...'),
    ],
  }
}

/**
 * Default foundation blueprints auto-created for new projects.
 */
export const DEFAULT_FOUNDATIONS = [
  {
    title: 'Backend Architecture',
    description: 'Framework, runtime, API design, error handling, logging, monitoring',
  },
  {
    title: 'Frontend Architecture',
    description: 'Component architecture, state management, styling, build optimization',
  },
  {
    title: 'Data Layer',
    description: 'Primary database, query patterns, caching, data validation, schema conventions',
  },
  {
    title: 'Authentication & Security',
    description: 'Auth method, session management, RBAC, secrets management, encryption',
  },
  {
    title: 'Deployment & DevOps',
    description: 'Hosting platform, CI/CD, environments, monitoring, backup strategy',
  },
]

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
