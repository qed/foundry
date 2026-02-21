'use client'

import Link from 'next/link'
import { usePermission } from '@/hooks/usePermission'
import type { ProjectPermission } from '@/lib/permissions/definitions'
import { AlertCircle } from 'lucide-react'

interface ModuleNavItemProps {
  name: string
  icon: React.ReactNode
  href: string
  requiredPermission: ProjectPermission
}

/**
 * Navigation item that shows disabled state if user lacks permission.
 */
export function ModuleNavItem({
  name,
  icon,
  href,
  requiredPermission,
}: ModuleNavItemProps) {
  const { canProject } = usePermission()

  const hasAccess = canProject(requiredPermission)

  if (!hasAccess) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-50 cursor-not-allowed"
        title="You don't have permission to access this module"
      >
        {icon}
        <div className="flex-1">
          <div className="text-sm font-medium text-text-secondary">{name}</div>
          <div className="text-xs text-text-tertiary flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Restricted
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-tertiary transition-colors"
    >
      {icon}
      <div className="flex-1">
        <div className="text-sm font-medium text-text-primary">{name}</div>
      </div>
    </Link>
  )
}
