'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
import {
  Lightbulb,
  Shapes,
  Monitor,
  Hammer,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react'

const MODULES = [
  { id: 'hall', name: 'The Hall', icon: Lightbulb, description: 'Ideation & brainstorming' },
  { id: 'shop', name: 'Pattern Shop', icon: Shapes, description: 'Requirements & patterns' },
  { id: 'room', name: 'Control Room', icon: Monitor, description: 'Blueprints & management' },
  { id: 'floor', name: 'Assembly Floor', icon: Hammer, description: 'Execution & building' },
  { id: 'lab', name: 'Insights Lab', icon: FlaskConical, description: 'Feedback & analytics' },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { org } = useOrg()
  const { project } = useProject()

  const baseUrl = `/org/${org.slug}/project/${project.id}`

  // Check if we're on the project dashboard (no module selected)
  const isDashboard =
    pathname === baseUrl || pathname === `${baseUrl}/`

  return (
    <aside
      className={`flex flex-col h-full bg-bg-secondary border-r border-border-default transition-all duration-300 w-64 ${
        isCollapsed ? 'md:w-20' : 'md:w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        {!isCollapsed && (
          <div className="min-w-0 flex-1 mr-2">
            <p className="text-xs text-text-tertiary uppercase tracking-wide truncate">
              {org.name}
            </p>
            <p className="text-sm font-semibold text-text-primary truncate">
              {project.name}
            </p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:inline-flex p-1.5 hover:bg-bg-tertiary rounded transition-colors text-text-secondary"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Dashboard link */}
        <Link
          href={baseUrl}
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isDashboard
              ? 'bg-accent-cyan/10 text-accent-cyan'
              : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
          }`}
          title={isCollapsed ? 'Dashboard' : undefined}
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-sm font-medium truncate">Dashboard</span>
          )}
        </Link>

        <div className="border-t border-border-default my-2" />

        {/* Module links */}
        {MODULES.map((module) => {
          const Icon = module.icon
          const isActive = pathname.includes(`/${module.id}`)

          return (
            <Link
              key={module.id}
              href={`${baseUrl}/${module.id}`}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-accent-cyan/10 text-accent-cyan'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
              title={isCollapsed ? module.name : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {module.name}
                  </div>
                  <div className="text-xs text-text-tertiary truncate">
                    {module.description}
                  </div>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border-default">
          <p className="text-xs text-text-tertiary">Helix Foundry v0.1</p>
        </div>
      )}
    </aside>
  )
}
