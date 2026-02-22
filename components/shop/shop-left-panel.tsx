'use client'

import { Search, FileText, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShopLeftPanelProps {
  open: boolean
}

export function ShopLeftPanel({ open }: ShopLeftPanelProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 border-r border-border-default bg-bg-secondary overflow-hidden transition-all duration-200 ease-in-out',
        open ? 'w-[280px]' : 'w-0'
      )}
    >
      <div className="w-[280px] h-full flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-border-default">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search features..."
              className="w-full pl-9 pr-3 py-1.5 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Product Overview - pinned */}
          <div className="p-3 border-b border-border-default">
            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors">
              <FileText className="w-4 h-4 text-accent-cyan flex-shrink-0" />
              <span className="truncate">Product Overview</span>
            </button>
          </div>

          {/* Feature Tree placeholder */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Feature Tree
              </span>
            </div>

            {/* Empty tree state */}
            <div className="py-6 text-center">
              <p className="text-xs text-text-tertiary">
                No features yet. Create an Epic to start building your feature
                tree.
              </p>
            </div>
          </div>

          {/* Technical Requirements section - collapsed */}
          <div className="border-t border-border-default p-3">
            <button className="w-full flex items-center gap-2 text-xs font-medium text-text-tertiary uppercase tracking-wider hover:text-text-secondary transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
              Technical Requirements
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
