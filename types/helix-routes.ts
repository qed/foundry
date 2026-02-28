/**
 * Helix route type definitions and URL builders.
 */

export type HelixStageSlug =
  | 'discovery'
  | 'requirements'
  | 'architecture'
  | 'implementation'
  | 'testing'
  | 'deployment'
  | 'monitoring'
  | 'retrospective'

export interface HelixRouteParams {
  orgSlug: string
  projectId: string
}

export interface HelixStageRouteParams extends HelixRouteParams {
  stageSlug: HelixStageSlug
}

export interface HelixStepRouteParams extends HelixStageRouteParams {
  stepKey: string
}

const HELIX_BASE = (orgSlug: string, projectId: string) =>
  `/org/${orgSlug}/project/${projectId}/helix`

export const helixRoutes = {
  /** Root helix dashboard */
  dashboard: (orgSlug: string, projectId: string) =>
    HELIX_BASE(orgSlug, projectId),

  /** Stage page */
  stage: (orgSlug: string, projectId: string, stageSlug: HelixStageSlug) =>
    `${HELIX_BASE(orgSlug, projectId)}/${stageSlug}`,

  /** Step page */
  step: (orgSlug: string, projectId: string, stageSlug: HelixStageSlug, stepKey: string) =>
    `${HELIX_BASE(orgSlug, projectId)}/${stageSlug}/${stepKey}`,
} as const

/** Map stage numbers to URL slugs */
export const STAGE_NUMBER_TO_SLUG: Record<number, HelixStageSlug> = {
  1: 'discovery',
  2: 'requirements',
  3: 'architecture',
  4: 'implementation',
  5: 'testing',
  6: 'deployment',
  7: 'monitoring',
  8: 'retrospective',
}

/** Map URL slugs back to stage numbers */
export const STAGE_SLUG_TO_NUMBER: Record<HelixStageSlug, number> = {
  discovery: 1,
  requirements: 2,
  architecture: 3,
  implementation: 4,
  testing: 5,
  deployment: 6,
  monitoring: 7,
  retrospective: 8,
}

/** Check if a string is a valid helix stage slug */
export function isValidStageSlug(slug: string): slug is HelixStageSlug {
  return slug in STAGE_SLUG_TO_NUMBER
}
