'use client'

import { Archive } from 'lucide-react'

export function ArchivedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-warning/15 text-accent-warning text-xs font-semibold">
      <Archive className="w-3 h-3" />
      ARCHIVED
    </span>
  )
}
