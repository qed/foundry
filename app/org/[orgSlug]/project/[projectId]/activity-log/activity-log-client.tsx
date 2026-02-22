'use client'

import { ClipboardList } from 'lucide-react'
import { useProject } from '@/lib/context/project-context'
import { ActivityLogViewer } from '@/components/activity/activity-log-viewer'

export function ActivityLogClient() {
  const { project } = useProject()

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-6 h-6 text-accent-cyan" />
        <div>
          <h1 className="text-xl font-bold text-text-primary">Activity Log</h1>
          <p className="text-xs text-text-tertiary">
            All actions performed in this project
          </p>
        </div>
      </div>

      <ActivityLogViewer projectId={project.id} />
    </div>
  )
}
