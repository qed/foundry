'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'

const MODULES = ['hall', 'shop', 'room', 'floor', 'lab'] as const

/**
 * Global keyboard shortcuts for project navigation.
 *
 * - Cmd/Ctrl + 1-5: Switch to module 1-5
 */
export function useKeyboardShortcuts() {
  const router = useRouter()
  const { org } = useOrg()
  const { project } = useProject()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't trigger when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      const modifierKey = isMac ? event.metaKey : event.ctrlKey

      // Cmd/Ctrl + 1-5: Jump to module
      if (modifierKey && !event.shiftKey && /^[1-5]$/.test(event.key)) {
        event.preventDefault()
        const moduleIndex = parseInt(event.key) - 1
        router.push(
          `/org/${org.slug}/project/${project.id}/${MODULES[moduleIndex]}`
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, org.slug, project.id])
}
