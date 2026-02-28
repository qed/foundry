'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProject } from '@/lib/context/project-context'
import { useOrg } from '@/lib/context/org-context'
import { HelixModeProvider, useHelixMode } from '@/lib/context/helix-mode-context'
import { HelixSidebarWrapper } from '@/components/helix/helix-sidebar-wrapper'

function HelixLayoutInner({ children }: { children: React.ReactNode }) {
  const { isHelixMode, isLoading } = useHelixMode()
  const { project } = useProject()
  const { org } = useOrg()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isHelixMode) {
      router.replace(`/org/${org.slug}/project/${project.id}`)
    }
  }, [isHelixMode, isLoading, router, org.slug, project.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-text-secondary">Loading Helix Mode...</div>
      </div>
    )
  }

  if (!isHelixMode) {
    return null
  }

  return (
    <div className="flex h-full">
      <HelixSidebarWrapper />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export default function HelixLayout({ children }: { children: React.ReactNode }) {
  return (
    <HelixModeProvider>
      <HelixLayoutInner>{children}</HelixLayoutInner>
    </HelixModeProvider>
  )
}
