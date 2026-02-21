'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
import { ChevronDown, Plus } from 'lucide-react'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

export function ProjectSwitcher() {
  const { org } = useOrg()
  const { project: currentProject } = useProject()
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    async function loadProjects() {
      setLoading(true)
      try {
        const response = await fetch(`/api/orgs/${org.id}/projects`)
        if (response.ok) {
          const data = await response.json()
          setProjects(data.projects || [])
        }
      } catch (error) {
        console.error('Failed to load projects:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [open, org.id])

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 hover:bg-bg-tertiary rounded-md transition-colors w-full"
      >
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {currentProject.name}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-text-tertiary flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-bg-tertiary border border-border-default rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          {loading && (
            <div className="p-3 text-sm text-text-tertiary text-center">
              Loading projects...
            </div>
          )}

          {!loading && projects.length === 0 && (
            <div className="p-3 text-sm text-text-tertiary text-center">
              No projects
            </div>
          )}

          {!loading &&
            projects.map((p) => (
              <Link
                key={p.id}
                href={`/org/${org.slug}/project/${p.id}`}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  p.id === currentProject.id
                    ? 'bg-accent-cyan/10 text-accent-cyan'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                }`}
              >
                {p.name}
              </Link>
            ))}

          <div className="border-t border-border-default p-1.5">
            <Link
              href={`/org/${org.slug}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary rounded-md transition-colors"
              onClick={() => setOpen(false)}
            >
              <Plus className="w-4 h-4" />
              Create Project
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
