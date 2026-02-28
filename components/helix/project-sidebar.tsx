'use client'

import { useProject } from '@/lib/context/project-context'
import { Sidebar } from '@/components/layout/sidebar'
import { HelixSidebar } from './helix-sidebar'

interface ProjectSidebarProps {
  onClose?: () => void
}

/**
 * Dynamic sidebar that shows either the standard v1 sidebar
 * or the Helix sidebar depending on the project's current mode.
 *
 * Note: The Helix sidebar requires HelixModeProvider, so it should only
 * be rendered inside the helix route layout where the provider exists.
 * When used outside helix routes, this will always render the standard sidebar.
 */
export function ProjectSidebar({ onClose }: ProjectSidebarProps) {
  const { project } = useProject()

  if (project.mode === 'helix') {
    return <HelixSidebar onClose={onClose} />
  }

  return <Sidebar onClose={onClose} />
}
