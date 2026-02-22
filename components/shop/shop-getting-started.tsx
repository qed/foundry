'use client'

import { useState } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ShopGettingStarted() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="mx-4 mt-4 p-4 rounded-lg border border-accent-warning/40 bg-accent-warning/10 flex items-start gap-3">
      <Lightbulb className="w-5 h-5 text-accent-warning flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary font-medium mb-1">
          Welcome to The Pattern Shop!
        </p>
        <p className="text-xs text-text-secondary mb-3">
          Start by creating your first Epic, or upload a project brief and let
          our agent generate a feature tree for you.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Create Epic</Button>
          <Button size="sm" variant="outline">
            Upload Brief & Generate Tree
          </Button>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
