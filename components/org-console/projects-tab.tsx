'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderKanban, ExternalLink, Archive, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast-container'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/database'

interface ProjectsTabProps {
  orgSlug: string
  initialProjects: Project[]
}

export function ProjectsTab({ orgSlug, initialProjects }: ProjectsTabProps) {
  const { addToast } = useToast()
  const [projects, setProjects] = useState(initialProjects)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const activeProjects = projects.filter((p) => !p.is_archived)
  const archivedProjects = projects.filter((p) => p.is_archived)
  const displayProjects = activeTab === 'active' ? activeProjects : archivedProjects

  async function handleArchive() {
    if (!archiveTarget) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${archiveTarget.id}/archive`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to archive project')
      }
      const { project: updated } = await res.json()
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      addToast(`${archiveTarget.name} archived`, 'success')
      setArchiveTarget(null)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to archive', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${restoreTarget.id}/restore`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to restore project')
      }
      const { project: updated } = await res.json()
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      addToast(`${restoreTarget.name} restored`, 'success')
      setRestoreTarget(null)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to restore', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border-default">
        <button
          onClick={() => setActiveTab('active')}
          className={cn(
            'pb-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'active'
              ? 'border-accent-cyan text-accent-cyan'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          Active ({activeProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={cn(
            'pb-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'archived'
              ? 'border-accent-cyan text-accent-cyan'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          Archived ({archivedProjects.length})
        </button>
      </div>

      {displayProjects.length === 0 ? (
        <div className="glass-panel rounded-xl p-8 text-center">
          <FolderKanban className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-1">
            {activeTab === 'active' ? 'No active projects' : 'No archived projects'}
          </p>
          <p className="text-xs text-text-tertiary">
            {activeTab === 'active'
              ? 'Create a project from the organization home page.'
              : 'Archived projects will appear here.'}
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl divide-y divide-border-default overflow-hidden">
          {displayProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <FolderKanban className={cn(
                'w-4 h-4 flex-shrink-0',
                project.is_archived ? 'text-text-tertiary' : 'text-accent-cyan'
              )} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  project.is_archived ? 'text-text-secondary' : 'text-text-primary'
                )}>
                  {project.name}
                </p>
                {project.description && (
                  <p className="text-xs text-text-tertiary truncate">
                    {project.description}
                  </p>
                )}
                {project.is_archived && project.archived_at && (
                  <p className="text-xs text-text-tertiary">
                    Archived {new Date(project.archived_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              {!project.is_archived && (
                <p className="text-xs text-text-tertiary hidden sm:block">
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
              )}
              <div className="flex items-center gap-1">
                <Link
                  href={`/org/${orgSlug}/project/${project.id}`}
                  className="p-1.5 text-text-tertiary hover:text-accent-cyan rounded transition-colors"
                  title="Open project"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
                {project.is_archived ? (
                  <button
                    onClick={() => setRestoreTarget(project)}
                    className="p-1.5 text-text-tertiary hover:text-accent-success rounded transition-colors"
                    title="Restore project"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setArchiveTarget(project)}
                    className="p-1.5 text-text-tertiary hover:text-accent-warning rounded transition-colors"
                    title="Archive project"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archive confirmation dialog */}
      <Dialog open={!!archiveTarget} onOpenChange={() => setArchiveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-text-primary">Archive project?</h2>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-text-secondary">
              You are about to archive <strong className="text-text-primary">{archiveTarget?.name}</strong>.
              The project will become read-only and move to the Archived tab.
            </p>
            <p className="text-sm text-text-secondary">
              <strong className="text-text-primary">You can restore this project later.</strong>
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleArchive} isLoading={isLoading}>
              Archive project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirmation dialog */}
      <Dialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-text-primary">Restore project?</h2>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-text-secondary">
              You are about to restore <strong className="text-text-primary">{restoreTarget?.name}</strong>.
              The project will become editable again and move to the Active tab.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRestoreTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRestore} isLoading={isLoading}>
              Restore project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
