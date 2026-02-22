/**
 * Blueprint review prompt builder.
 * Creates a structured review prompt for the agent to analyze blueprints
 * for completeness, consistency, and quality.
 */

interface ReviewContext {
  blueprintTitle: string
  blueprintType: string
  blueprintStatus: string
  blueprintContent: string
  featureRequirements: string | null
  foundationSummaries: { title: string; preview: string }[]
}

export function buildReviewPrompt(ctx: ReviewContext): string {
  const parts: string[] = []

  parts.push(`Please review the following ${ctx.blueprintType} blueprint: "${ctx.blueprintTitle}" (status: ${ctx.blueprintStatus}).`)
  parts.push(``)
  parts.push(`**Blueprint Content:**`)
  parts.push(ctx.blueprintContent)

  if (ctx.featureRequirements) {
    parts.push(``)
    parts.push(`**Feature Requirements (for alignment check):**`)
    parts.push(ctx.featureRequirements)
  }

  if (ctx.foundationSummaries.length > 0) {
    parts.push(``)
    parts.push(`**Project Foundations (for consistency check):**`)
    for (const f of ctx.foundationSummaries) {
      parts.push(`- **${f.title}:** ${f.preview}`)
    }
  }

  parts.push(``)
  parts.push(`**Review Instructions:**`)
  parts.push(`Analyze this blueprint and provide a structured review with:`)
  parts.push(``)
  parts.push(`1. **Assessment**: Rate as "Excellent", "Good", or "Needs Work" with a score from 1-10`)
  parts.push(`2. **Summary**: 1-2 sentence overview of blueprint quality`)
  parts.push(`3. **Critical Issues** (must fix): Missing required content, conflicts with architecture, technical infeasibility, security concerns`)
  parts.push(`4. **Important Issues** (should fix): Unclear descriptions, incomplete sections, missing edge cases, convention violations`)
  parts.push(`5. **Suggestions** (nice to have): Formatting improvements, additional examples, clearer wording`)
  parts.push(`6. **Strengths**: What's done well — acknowledge positive aspects`)
  parts.push(``)
  parts.push(`For each issue, include:`)
  parts.push(`- **Issue title** (short, specific)`)
  parts.push(`- **Location** (which section)`)
  parts.push(`- **Description** (1-2 sentences)`)
  parts.push(`- **Suggested fix** (actionable steps)`)
  parts.push(``)

  // Type-specific review criteria
  if (ctx.blueprintType === 'feature') {
    parts.push(`**Feature Blueprint Checklist:**`)
    parts.push(`- Solution Overview explains what and why`)
    parts.push(`- API endpoints have full specs (method, path, params, response, errors)`)
    parts.push(`- UI components clearly describe behavior and states`)
    parts.push(`- Data model changes are specific (tables, columns, constraints, indexes)`)
    parts.push(`- Business logic is detailed and actionable`)
    parts.push(`- Testing requirements cover happy path and edge cases`)
    parts.push(`- Dependencies listed and explained`)
    parts.push(`- Aligns with feature requirements`)
    parts.push(`- Consistent with project foundations`)
  } else if (ctx.blueprintType === 'foundation') {
    parts.push(`**Foundation Blueprint Checklist:**`)
    parts.push(`- Technology choices are clearly justified`)
    parts.push(`- Architectural principles are clearly stated`)
    parts.push(`- Conventions are documented with examples`)
    parts.push(`- Constraints and limitations are identified`)
    parts.push(`- Provides enough guidance for feature blueprints to follow`)
  } else if (ctx.blueprintType === 'system_diagram') {
    parts.push(`**System Diagram Checklist:**`)
    parts.push(`- Diagram syntax is valid`)
    parts.push(`- Components are clearly labeled`)
    parts.push(`- Data flow is obvious`)
    parts.push(`- Key interactions are documented`)
  }

  return parts.join('\n')
}
