'use client'

import type { IdeaWithDetails } from './types'

interface IdeaInfoPanelProps {
  idea: IdeaWithDetails
}

export function IdeaInfoPanel({ idea }: IdeaInfoPanelProps) {
  const statusLabel = idea.status.charAt(0).toUpperCase() + idea.status.slice(1)
  const createdDate = new Date(idea.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const updatedDate = new Date(idea.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="border-t border-border-default pt-4">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
        Idea Info
      </h3>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-text-tertiary text-xs">Status</dt>
          <dd className="font-medium text-text-primary">{statusLabel}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary text-xs">Created</dt>
          <dd className="font-medium text-text-primary">{createdDate}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary text-xs">Updated</dt>
          <dd className="font-medium text-text-primary">{updatedDate}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary text-xs">Tags</dt>
          <dd className="font-medium text-text-primary">{idea.tags.length}</dd>
        </div>
      </dl>
    </div>
  )
}
