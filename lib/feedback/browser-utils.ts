/**
 * Browser/device detection utilities for feedback metadata.
 */

export function getUserAgentInfo(userAgent: string | null): {
  browser: string
  userAgent: string
} {
  if (!userAgent) {
    return { browser: 'Unknown', userAgent: 'Unknown' }
  }

  let browser = 'Unknown'
  // Order matters: Edge contains "Chrome", Chrome contains "Safari"
  if (userAgent.includes('Edg')) browser = 'Edge'
  else if (userAgent.includes('Chrome')) browser = 'Chrome'
  else if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Safari')) browser = 'Safari'

  return { browser, userAgent }
}

export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (/mobile|android|iphone|ipod/i.test(userAgent)) return 'mobile'
  if (/ipad|tablet|kindle/i.test(userAgent)) return 'tablet'
  return 'desktop'
}
