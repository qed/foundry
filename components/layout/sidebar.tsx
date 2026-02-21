'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
import { usePermission } from '@/hooks/usePermission'
import { ProjectPermissions } from '@/lib/permissions/definitions'
import type { ProjectPermission } from '@/lib/permissions/definitions'
import {
  Lightbulb,
  Shapes,
  Monitor,
  Hammer,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  AlertCircle,
} from 'lucide-react'
import { OrgSwitcher } from './org-switcher'
import { ProjectSwitcher } from './project-switcher'
import { KeyboardHint } from './keyboard-hint'

const MODULES: {
  id: string
  name: string
  icon: typeof Lightbulb
  description: string
  requiredPermission: ProjectPermission
}[] = [
  {
    id: 'hall',
    name: 'The Hall',
    icon: Lightbulb,
    description: 'Ideation & brainstorming',
    requiredPermission: ProjectPermissions.VIEW_REQUIREMENTS,
  },
  {
    id: 'shop',
    name: 'Pattern Shop',
    icon: Shapes,
    description: 'Requirements & patterns',
    requiredPermission: ProjectPermissions.VIEW_BLUEPRINTS,
  },
  {
    id: 'room',
    name: 'Control Room',
    icon: Monitor,
    description: 'Blueprints & management',
    requiredPermission: ProjectPermissions.VIEW_DASHBOARD,
  },
  {
    id: 'floor',
    name: 'Assembly Floor',
    icon: Hammer,
    description: 'Execution & building',
    requiredPermission: ProjectPermissions.VIEW_WORK_ORDERS,
  },
  {
    id: 'lab',
    name: 'Insights Lab',
    icon: FlaskConical,
    description: 'Feedback & analytics',
    requiredPermission: ProjectPermissions.VIEW_INSIGHTS,
  },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { org } = useOrg()
  const { project } = useProject()
  const { canProject } = usePermission()

  const baseUrl = `/org/${org.slug}/project/${project.id}`

  const isDashboard = pathname === baseUrl || pathname === `${baseUrl}/`

  return (
    <aside
      className={`flex flex-col h-full bg-bg-secondary border-r border-border-default transition-all duration-300 w-64 ${
        isCollapsed ? 'md:w-20' : 'md:w-64'
      }`}
    >
      {/* Header with org/project switchers */}
      <div className="p-4 border-b border-border-default">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex-1 min-w-0 mr-2 space-y-1">
              <OrgSwitcher />
              <ProjectSwitcher />
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

        {/* Module links with permission awareness */}
        {MODULES.map((mod) => {
          const Icon = mod.icon
          const isActive = pathname.includes(`/${mod.id}`)
          const hasAccess = canProject(mod.requiredPermission)

          if (!hasAccess) {
            return (
              <div
                key={mod.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-50 cursor-not-allowed"
                title="You don't have permission to access this module"
              >
                <Icon className="w-5 h-5 flex-shrink-0 text-text-tertiary" />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-tertiary truncate">
                      {mod.name}
                    </div>
                    <div className="text-xs text-text-tertiary flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Restricted
                    </div>
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={mod.id}
              href={`${baseUrl}/${mod.id}`}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-accent-cyan/10 text-accent-cyan'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
              title={isCollapsed ? mod.name : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {mod.name}
                  </div>
                  <div className="text-xs text-text-tertiary truncate">
                    {mod.description}
                  </div>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer with keyboard hints */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border-default space-y-3">
          <KeyboardHint />
          <p className="text-xs text-text-tertiary">Helix Foundry v0.1</p>
        </div>
      )}
    </aside>
  )
}
