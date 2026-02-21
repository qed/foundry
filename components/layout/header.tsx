'use client'

import { usePathname } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
import { UserMenu } from './user-menu'
import { Breadcrumb, type BreadcrumbItem } from './breadcrumb'
import { Menu } from 'lucide-react'

const MODULE_NAMES: Record<string, string> = {
  hall: 'The Hall',
  shop: 'Pattern Shop',
  room: 'Control Room',
  floor: 'Assembly Floor',
  lab: 'Insights Lab',
}

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const { org } = useOrg()
  const { project } = useProject()

  // Extract active module from pathname
  const activeModule = Object.keys(MODULE_NAMES).find((m) =>
    pathname.includes(`/${m}`)
  )

  const breadcrumbs: BreadcrumbItem[] = [
    { label: org.name, href: `/org/${org.slug}` },
    { label: project.name, href: `/org/${org.slug}/project/${project.id}` },
  ]

  if (activeModule) {
    breadcrumbs.push({
      label: MODULE_NAMES[activeModule],
      href: `/org/${org.slug}/project/${project.id}/${activeModule}`,
    })
  }

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-bg-secondary border-b border-border-default">
      {/* Left side: hamburger + breadcrumbs */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Breadcrumb items={breadcrumbs} />
      </div>

      {/* Right side: user menu */}
      <div className="ml-4">
        <UserMenu />
      </div>
    </header>
  )
}
