/**
 * Blueprint generation prompt builder.
 * Creates a structured prompt for the agent to generate blueprint drafts
 * based on feature requirements and project context.
 */

interface FeatureContext {
  title: string
  description: string | null
  level: string
  parentTitle: string | null
  requirementsContent: string | null
  technicalRequirementsContent: string | null
}

interface FoundationSummary {
  title: string
  contentPreview: string
}

export function buildGenerationPrompt(
  feature: FeatureContext,
  foundations: FoundationSummary[]
): string {
  const parts: string[] = []

  parts.push(`Please generate a technical blueprint for the following feature:`)
  parts.push(``)
  parts.push(`**Feature:** ${feature.title}`)
  if (feature.parentTitle) {
    parts.push(`**Part of:** ${feature.parentTitle}`)
  }
  if (feature.description) {
    parts.push(`**Description:** ${feature.description}`)
  }

  if (feature.requirementsContent) {
    parts.push(``)
    parts.push(`**Feature Requirements:**`)
    parts.push(feature.requirementsContent)
  }

  if (feature.technicalRequirementsContent) {
    parts.push(``)
    parts.push(`**Technical Requirements:**`)
    parts.push(feature.technicalRequirementsContent)
  }

  if (foundations.length > 0) {
    parts.push(``)
    parts.push(`**Project Architecture & Conventions:**`)
    for (const f of foundations) {
      parts.push(`- **${f.title}:** ${f.contentPreview}`)
    }
  }

  parts.push(``)
  parts.push(`Please structure the blueprint with these sections:`)
  parts.push(`1. **Solution Overview** — Summary of the approach, key benefits, and how it fits into the system`)
  parts.push(`2. **API Endpoints** — HTTP methods, paths, request/response schemas`)
  parts.push(`3. **UI Components & Behavior** — Components needed, interactions, states`)
  parts.push(`4. **Data Model Changes** — New tables, columns, indexes, migrations`)
  parts.push(`5. **Business Logic** — Core logic, validations, edge cases`)
  parts.push(`6. **Testing Requirements** — Unit tests, integration tests, edge cases`)
  parts.push(`7. **Dependencies** — External packages, internal modules, related features`)
  parts.push(``)
  parts.push(`For each section, provide clear, actionable details. Include code examples with language specified where helpful. Use tables for data models. Reference the project's architecture decisions and conventions.`)

  return parts.join('\n')
}

export function buildSectionGenerationPrompt(
  feature: FeatureContext,
  section: string,
  existingContent: string | null
): string {
  const parts: string[] = []

  parts.push(`Please generate detailed content for the **${section}** section of the blueprint for "${feature.title}".`)

  if (existingContent) {
    parts.push(``)
    parts.push(`The current content for this section is:`)
    parts.push(existingContent)
    parts.push(``)
    parts.push(`Please expand and improve this content with more actionable detail.`)
  }

  if (feature.requirementsContent) {
    parts.push(``)
    parts.push(`Feature requirements for context:`)
    parts.push(feature.requirementsContent)
  }

  return parts.join('\n')
}
