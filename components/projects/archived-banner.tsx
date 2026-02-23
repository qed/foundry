'use client'

import { Archive } from 'lucide-react'

export function ArchivedBanner() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-accent-warning/10 border-b border-accent-warning/20">
      <Archive className="w-4 h-4 text-accent-warning flex-shrink-0" />
      <p className="text-sm text-accent-warning">
        This project is archived and read-only. Contact an admin to restore it.
      </p>
    </div>
  )
}
