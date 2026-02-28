import { helixRoutes, STAGE_NUMBER_TO_SLUG } from '@/types/helix-routes'
import type { HelixStageSlug } from '@/types/helix-routes'

/**
 * Deep link utilities for Helix Mode.
 * Provides URL generation and parsing for helix-specific routes.
 */

export interface HelixDeepLink {
  type: 'dashboard' | 'stage' | 'step'
  orgSlug: string
  projectId: string
  stageSlug?: HelixStageSlug
  stepKey?: string
}

/**
 * Build a deep link URL from structured parameters.
 */
export function buildHelixUrl(link: HelixDeepLink): string {
  switch (link.type) {
    case 'dashboard':
      return helixRoutes.dashboard(link.orgSlug, link.projectId)
    case 'stage':
      if (!link.stageSlug) {
        return helixRoutes.dashboard(link.orgSlug, link.projectId)
      }
      return helixRoutes.stage(link.orgSlug, link.projectId, link.stageSlug)
    case 'step':
      if (!link.stageSlug || !link.stepKey) {
        return helixRoutes.dashboard(link.orgSlug, link.projectId)
      }
      return helixRoutes.step(link.orgSlug, link.projectId, link.stageSlug, link.stepKey)
    default:
      return helixRoutes.dashboard(link.orgSlug, link.projectId)
  }
}

/**
 * Build a URL for a specific step by its key (e.g., '3.2').
 * Resolves the stage slug automatically from the step key.
 */
export function buildStepUrl(
  orgSlug: string,
  projectId: string,
  stepKey: string
): string {
  const stageNumber = parseInt(stepKey.split('.')[0], 10)
  const stageSlug = STAGE_NUMBER_TO_SLUG[stageNumber]
  if (!stageSlug) {
    return helixRoutes.dashboard(orgSlug, projectId)
  }
  return helixRoutes.step(orgSlug, projectId, stageSlug, stepKey)
}

/**
 * Build a URL for a specific stage by its number.
 */
export function buildStageUrl(
  orgSlug: string,
  projectId: string,
  stageNumber: number
): string {
  const stageSlug = STAGE_NUMBER_TO_SLUG[stageNumber]
  if (!stageSlug) {
    return helixRoutes.dashboard(orgSlug, projectId)
  }
  return helixRoutes.stage(orgSlug, projectId, stageSlug)
}

/**
 * Parse a helix URL path to extract structured parameters.
 * Returns null if the path is not a valid helix URL.
 */
export function parseHelixUrl(pathname: string): HelixDeepLink | null {
  // Expected format: /org/{orgSlug}/project/{projectId}/helix/...
  const match = pathname.match(
    /^\/org\/([^/]+)\/project\/([^/]+)\/helix(?:\/([^/]+)(?:\/([^/]+))?)?$/
  )
  if (!match) return null

  const [, orgSlug, projectId, stageSlug, stepKey] = match

  if (!orgSlug || !projectId) return null

  if (stepKey && stageSlug) {
    return {
      type: 'step',
      orgSlug,
      projectId,
      stageSlug: stageSlug as HelixStageSlug,
      stepKey,
    }
  }

  if (stageSlug) {
    return {
      type: 'stage',
      orgSlug,
      projectId,
      stageSlug: stageSlug as HelixStageSlug,
    }
  }

  return {
    type: 'dashboard',
    orgSlug,
    projectId,
  }
}

/**
 * Check if a URL path is within the helix routes.
 */
export function isHelixPath(pathname: string): boolean {
  return /\/org\/[^/]+\/project\/[^/]+\/helix(\/|$)/.test(pathname)
}
