'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProject } from '@/lib/context/project-context'
import { useOrg } from '@/lib/context/org-context'
import { isHelixPath, parseHelixUrl } from '@/lib/helix/deep-link'
import { helixRoutes } from '@/types/helix-routes'
import { getStageBySlug, getStep } from '@/config/helix-process'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
  current?: boolean
}

export function ProjectBreadcrumb() {
  const { project } = useProject()
  const { org } = useOrg()
  const pathname = usePathname()

  const projectUrl = `/org/${org.slug}/project/${project.id}`
  const items: BreadcrumbItem[] = [
    { label: project.name, href: projectUrl },
  ]

  // Add helix-specific breadcrumbs
  if (isHelixPath(pathname)) {
    const parsed = parseHelixUrl(pathname)

    items.push({
      label: 'Helix',
      href: helixRoutes.dashboard(org.slug, project.id),
      current: parsed?.type === 'dashboard',
    })

    if (parsed?.stageSlug) {
      const stageConfig = getStageBySlug(parsed.stageSlug)
      if (stageConfig) {
        items.push({
          label: stageConfig.title,
          href: helixRoutes.stage(org.slug, project.id, parsed.stageSlug),
          current: parsed.type === 'stage',
        })
      }
    }

    if (parsed?.stepKey) {
      const stepConfig = getStep(parsed.stepKey)
      if (stepConfig) {
        items.push({
          label: `Step ${parsed.stepKey}: ${stepConfig.title}`,
          href: pathname,
          current: true,
        })
      }
    }
  }

  // Mark last item as current if not already set
  if (items.length > 0 && !items.some((i) => i.current)) {
    items[items.length - 1].current = true
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <div key={item.href} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
          )}
          {item.current ? (
            <span className="text-text-primary font-medium truncate max-w-[200px]">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="text-text-secondary hover:text-text-primary transition-colors truncate max-w-[200px]"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
