'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useProject } from '@/lib/context/project-context'
import { useOrg } from '@/lib/context/org-context'
import { isHelixPath } from '@/lib/helix/deep-link'
import { helixRoutes } from '@/types/helix-routes'

interface DeepLinkNavigationGuardProps {
  children: React.ReactNode
}

/**
 * Navigation guard that handles deep links into Helix Mode.
 *
 * If a user navigates to a Helix URL but the project is in Open mode,
 * it shows a prompt to switch modes or redirects to the project root.
 */
export function DeepLinkNavigationGuard({ children }: DeepLinkNavigationGuardProps) {
  const { project } = useProject()
  const { org } = useOrg()
  const pathname = usePathname()
  const router = useRouter()
  const [showModePrompt, setShowModePrompt] = useState(false)

  const isOnHelixRoute = isHelixPath(pathname)
  const isHelixMode = project.mode === 'helix'

  useEffect(() => {
    if (isOnHelixRoute && !isHelixMode) {
      setShowModePrompt(true)
    } else {
      setShowModePrompt(false)
    }
  }, [isOnHelixRoute, isHelixMode])

  const handleSwitchToHelix = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'helix' }),
      })

      if (res.ok) {
        window.location.reload()
      }
    } catch {
      // Redirect to project root on error
      router.replace(`/org/${org.slug}/project/${project.id}`)
    }
  }

  const handleGoBack = () => {
    router.replace(`/org/${org.slug}/project/${project.id}`)
  }

  if (showModePrompt) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-6 max-w-md w-full text-center">
          <div className="text-4xl mb-4">&#x1F504;</div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Helix Mode Required
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            This page is part of the Helix structured development process.
            Switch to Helix Mode to access this content.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleGoBack}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border-default rounded-md transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={handleSwitchToHelix}
              className="px-4 py-2 text-sm bg-accent-cyan text-white rounded-md hover:opacity-90 transition-opacity"
            >
              Switch to Helix Mode
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
