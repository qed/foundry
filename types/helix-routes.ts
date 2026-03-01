/**
 * Helix route type definitions and URL builders.
 */

export type HelixStageSlug =
  | 'planning'
  | 'documentation'
  | 'build-planning'
  | 'repo-setup'
  | 'review'
  | 'build'
  | 'testing'
  | 'deployment'

export interface HelixRouteParams {
  orgSlug: string
  projectId: string
}

export interface HelixStageRouteParams extends HelixRouteParams {
  stageSlug: HelixStageSlug
}

export interface HelixStepRouteParams extends HelixRouteParams {
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
  step: (orgSlug: string, projectId: string, stepKey: string) =>
    `${HELIX_BASE(orgSlug, projectId)}/step/${stepKey}`,
} as const

/** Map stage numbers to URL slugs */
export const STAGE_NUMBER_TO_SLUG: Record<number, HelixStageSlug> = {
  1: 'planning',
  2: 'documentation',
  3: 'build-planning',
  4: 'repo-setup',
  5: 'review',
  6: 'build',
  7: 'testing',
  8: 'deployment',
}

/** Map URL slugs back to stage numbers */
export const STAGE_SLUG_TO_NUMBER: Record<HelixStageSlug, number> = {
  planning: 1,
  documentation: 2,
  'build-planning': 3,
  'repo-setup': 4,
  review: 5,
  build: 6,
  testing: 7,
  deployment: 8,
}

/** Check if a string is a valid helix stage slug */
export function isValidStageSlug(slug: string): slug is HelixStageSlug {
  return slug in STAGE_SLUG_TO_NUMBER
}
