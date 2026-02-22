'use client'

import Link from 'next/link'
import { FolderKanban, ExternalLink } from 'lucide-react'
import type { Project } from '@/types/database'

interface ProjectsTabProps {
  orgSlug: string
  initialProjects: Project[]
}

export function ProjectsTab({ orgSlug, initialProjects }: ProjectsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          {initialProjects.length} project{initialProjects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {initialProjects.length === 0 ? (
        <div className="glass-panel rounded-xl p-8 text-center">
          <FolderKanban className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-1">No projects yet</p>
          <p className="text-xs text-text-tertiary">
            Create a project from the organization home page.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl divide-y divide-border-default overflow-hidden">
          {initialProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <FolderKanban className="w-4 h-4 text-accent-cyan flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {project.name}
                </p>
                {project.description && (
                  <p className="text-xs text-text-tertiary truncate">
                    {project.description}
                  </p>
                )}
              </div>
              <p className="text-xs text-text-tertiary hidden sm:block">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
              <Link
                href={`/org/${orgSlug}/project/${project.id}`}
                className="p-1.5 text-text-tertiary hover:text-accent-cyan rounded transition-colors"
                title="Open project"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
