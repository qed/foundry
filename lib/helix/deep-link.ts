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
      if (!link.stepKey) {
        return helixRoutes.dashboard(link.orgSlug, link.projectId)
      }
      return helixRoutes.step(link.orgSlug, link.projectId, link.stepKey)
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
  return helixRoutes.step(orgSlug, projectId, stepKey)
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
  // Expected formats:
  //   /org/{orgSlug}/project/{projectId}/helix
  //   /org/{orgSlug}/project/{projectId}/helix/{stageSlug}
  //   /org/{orgSlug}/project/{projectId}/helix/step/{stepKey}
  const base = pathname.match(
    /^\/org\/([^/]+)\/project\/([^/]+)\/helix(?:\/(.+))?$/
  )
  if (!base) return null

  const [, orgSlug, projectId, rest] = base

  if (!orgSlug || !projectId) return null

  if (!rest) {
    return { type: 'dashboard', orgSlug, projectId }
  }

  // Step URL: /helix/step/{stepKey}
  const stepMatch = rest.match(/^step\/([^/]+)$/)
  if (stepMatch) {
    return {
      type: 'step',
      orgSlug,
      projectId,
      stepKey: stepMatch[1],
    }
  }

  // Stage URL: /helix/{stageSlug}
  return {
    type: 'stage',
    orgSlug,
    projectId,
    stageSlug: rest as HelixStageSlug,
  }
}

/**
 * Check if a URL path is within the helix routes.
 */
export function isHelixPath(pathname: string): boolean {
  return /\/org\/[^/]+\/project\/[^/]+\/helix(\/|$)/.test(pathname)
}
